"""
Detects XP, badge, and streak celebrations not yet acknowledged by the learner.
"""

import uuid
from copy import deepcopy

from apps.gamification.models import EmployeeCelebrationAck
from apps.gamification.services.badge_catalog_service import BadgeCatalogService
from apps.gamification.services.learner_gamification_service import LearnerGamificationService

STREAK_MILESTONES = (7, 14, 30, 60)

STREAK_LABELS = {
    "learning": "Learning streak",
    "pass_daily": "Daily pass streak",
    "attempt_daily": "Daily attempt streak",
    "pass_consecutive": "Pass streak",
}

DEFAULT_CELEBRATION_GIFS = {
    "xp": "xp-earned",
    "streak": "streak-milestone",
}


def _badge_tier(category: str) -> str:
    if category in ("milestone", "certificates"):
        return "epic"
    if category in ("assessment", "skills", "compliance"):
        return "rare"
    return "common"


def _badge_gif_key(icon_key: str, category: str) -> str:
    return f"tier-{_badge_tier(category)}"


def _empty_streaks() -> dict:
    return {
        "learning": 0,
        "pass_daily": 0,
        "attempt_daily": 0,
        "pass_consecutive": 0,
    }


class PendingCelebrationService:
    def __init__(
        self,
        learner_service: LearnerGamificationService | None = None,
        catalog_service: BadgeCatalogService | None = None,
    ):
        self._learner = learner_service or LearnerGamificationService()
        self._catalog = catalog_service or BadgeCatalogService()

    def build_snapshot(self, employee) -> dict:
        summary = self._learner.build_summary(employee)
        catalog = self._catalog.build_catalog(employee.id)
        streaks = summary["streaks"]
        return {
            "lifetime_xp": summary["lifetime_xp"],
            "badge_codes": [row["code"] for row in catalog if row["is_earned"]],
            "streaks": {
                "learning": streaks["learning"]["current"],
                "pass_daily": streaks["pass_daily"]["current"],
                "attempt_daily": streaks["attempt_daily"]["current"],
                "pass_consecutive": streaks["pass_consecutive"]["current"],
            },
            "celebrated_streak_milestones": [],
        }

    def get_ack_snapshot(self, employee_id: int) -> dict | None:
        row = EmployeeCelebrationAck.objects.filter(employee_id=employee_id).first()
        if not row or not row.snapshot:
            return None
        return row.snapshot

    def save_ack(self, employee, snapshot: dict | None = None) -> dict:
        if snapshot is not None:
            payload = snapshot
        else:
            payload = self.build_snapshot(employee)
            previous = self.get_ack_snapshot(employee.id)
            if previous:
                payload["celebrated_streak_milestones"] = list(
                    previous.get("celebrated_streak_milestones") or []
                )
        EmployeeCelebrationAck.objects.update_or_create(
            employee_id=employee.id,
            defaults={
                "company_id": employee.company_id,
                "snapshot": payload,
            },
        )
        return payload

    def get_pending(self, employee) -> dict:
        current = self.build_snapshot(employee)
        catalog = self._catalog.build_catalog(employee.id)
        previous = self.get_ack_snapshot(employee.id)

        if previous is None:
            return {
                "needs_baseline": True,
                "events": [],
                "snapshot": current,
            }

        events, new_celebrated = self._detect(previous, current, catalog)
        merged = deepcopy(current)
        merged["celebrated_streak_milestones"] = list(
            set(previous.get("celebrated_streak_milestones") or []) | set(new_celebrated)
        )
        return {
            "needs_baseline": False,
            "events": events,
            "snapshot": merged,
        }

    def _detect(
        self,
        previous: dict,
        current: dict,
        catalog: list[dict],
    ) -> tuple[list[dict], list[str]]:
        events: list[dict] = []
        xp_gain = current["lifetime_xp"] - previous.get("lifetime_xp", 0)
        if xp_gain > 0:
            events.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": "xp",
                    "title": f"+{xp_gain:,} XP",
                    "subtitle": "Learning points added to your total",
                    "amount": xp_gain,
                    "gif_key": DEFAULT_CELEBRATION_GIFS["xp"],
                }
            )

        previous_badges = set(previous.get("badge_codes") or [])
        earned_now = [row for row in catalog if row["is_earned"]]
        for badge in earned_now:
            if badge["code"] not in previous_badges:
                events.append(
                    {
                        "id": str(uuid.uuid4()),
                        "type": "badge",
                        "title": "Badge unlocked!",
                        "subtitle": badge["name"],
                        "badge": {
                            "code": badge["code"],
                            "name": badge["name"],
                            "description": badge["description"],
                            "category": badge["category"],
                            "icon_key": badge["icon_key"],
                        },
                        "gif_key": _badge_gif_key(badge["icon_key"], badge["category"]),
                    }
                )

        celebrated = set(previous.get("celebrated_streak_milestones") or [])
        new_celebrated: list[str] = []
        prev_streaks = previous.get("streaks") or _empty_streaks()
        curr_streaks = current.get("streaks") or _empty_streaks()

        for key, label in STREAK_LABELS.items():
            current_val = curr_streaks.get(key, 0)
            prev_val = prev_streaks.get(key, 0)
            for milestone in STREAK_MILESTONES:
                milestone_key = f"{key}:{milestone}"
                if milestone_key in celebrated:
                    continue
                if current_val >= milestone and prev_val < milestone:
                    celebrated.add(milestone_key)
                    new_celebrated.append(milestone_key)
                    events.append(
                        {
                            "id": str(uuid.uuid4()),
                            "type": "streak",
                            "title": f"{milestone}-day streak!",
                            "subtitle": label,
                            "streak_label": label,
                            "streak_days": milestone,
                            "gif_key": DEFAULT_CELEBRATION_GIFS["streak"],
                        }
                    )
                    break

        return events, new_celebrated
