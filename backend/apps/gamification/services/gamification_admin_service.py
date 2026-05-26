from django.db.models import Q

from apps.gamification.models import AwardRule, CompanyGamificationConfig
from apps.gamification.repositories import AwardRuleRepository, CompanyGamificationConfigRepository


class GamificationAdminService:
    def __init__(
        self,
        config_repository: CompanyGamificationConfigRepository | None = None,
        rule_repository: AwardRuleRepository | None = None,
    ):
        self._configs = config_repository or CompanyGamificationConfigRepository()
        self._rules = rule_repository or AwardRuleRepository()

    def get_company_config(self, company_id: int) -> CompanyGamificationConfig:
        config, _ = self._configs.get_or_create_for_company(company_id)
        return config

    def update_company_config(self, company_id: int, data: dict) -> CompanyGamificationConfig:
        config = self.get_company_config(company_id)
        allowed = {
            "is_enabled",
            "inactive_leaderboard_days",
            "learning_streak_min_seconds",
            "mandatory_course_xp_multiplier",
            "retake_xp_percent_2nd",
            "retake_xp_percent_3rd_plus",
            "streak_daily_xp_bonus",
        }
        for field, value in data.items():
            if field in allowed:
                setattr(config, field, value)
        config.save()
        return config

    def list_award_rules(self, company_id: int):
        return (
            AwardRule.objects.filter(Q(company_id=company_id) | Q(company__isnull=True))
            .order_by("code", "-company_id")
        )

    def update_award_rule(self, company_id: int, rule_id: int, data: dict) -> AwardRule | None:
        rule = AwardRule.objects.filter(pk=rule_id).first()
        if not rule:
            return None

        if rule.company_id and rule.company_id != company_id:
            return None

        if rule.company_id is None:
            rule, _ = AwardRule.objects.get_or_create(
                code=rule.code,
                company_id=company_id,
                defaults={
                    "name": rule.name,
                    "event_type": rule.event_type,
                    "base_points": rule.base_points,
                    "multiplier": rule.multiplier,
                    "is_active": rule.is_active,
                },
            )

        allowed = {"name", "base_points", "multiplier", "is_active"}
        for field, value in data.items():
            if field in allowed:
                setattr(rule, field, value)
        rule.save()
        return rule
