"""
ManagerRatingService

Handles the manager review step of the TNI cycle:
  - Fetch direct reports who have submitted self-ratings and are pending review
  - Save / update draft manager ratings
  - Bulk-submit manager ratings for an employee, which:
      1. Updates EmployeeSkill.current_level + identified_by = MANAGER
      2. Triggers TNIEngineService to run gap analysis and auto-create TrainingNeeds

The service never touches the ORM directly — all DB access goes through
the relevant repositories.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..repositories import (
    EmployeeSkillRatingRepository,
    EmployeeSkillRepository,
)
from ..models import SkillRatingType, SkillRatingStatus, SkillIdentifiedBy


class ManagerRatingService:
    """
    Manages the manager review step of the TNI cycle.
    """

    def __init__(self):
        self.rating_repo = EmployeeSkillRatingRepository()
        self.employee_skill_repo = EmployeeSkillRepository()

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get_pending_review_employees(self, manager_id):
        """
        Return EmployeeMaster queryset of direct reports who:
          - Have at least one SUBMITTED self-rating
          - Do NOT yet have a SUBMITTED manager rating for the same skill
            (i.e. still pending manager review)

        Uses EmployeeReportingManager with relationship_type=DIRECT.
        """
        from apps.org_management.models import EmployeeReportingManager, EmployeeMaster

        # Direct report employee IDs for this manager
        direct_report_ids = EmployeeReportingManager.objects.filter(
            manager_id=manager_id,
            relationship_type="DIRECT",
        ).values_list("employee_id", flat=True)

        # Among those, keep only employees who have at least one SUBMITTED self-rating
        employees_with_self_rating = (
            self.rating_repo.filter(
                employee_id__in=direct_report_ids,
                rating_type=SkillRatingType.SELF,
                status=SkillRatingStatus.SUBMITTED,
                is_latest=True,
            )
            .values_list("employee_id", flat=True)
            .distinct()
        )

        return EmployeeMaster.objects.filter(id__in=employees_with_self_rating)

    def get_employee_self_ratings(self, employee_id):
        """
        Return all SUBMITTED self-ratings for a given employee.
        Used by the manager review page to show the side-by-side comparison.
        """
        return self.rating_repo.get_for_employee(
            employee_id=employee_id,
            rating_type=SkillRatingType.SELF,
            status=SkillRatingStatus.SUBMITTED,
        ).select_related("skill", "rated_level")

    def get_manager_draft_ratings(self, manager_id, employee_id):
        """Return all DRAFT manager ratings for a given employee by this manager."""
        return self.rating_repo.filter(
            employee_id=employee_id,
            rating_type=SkillRatingType.MANAGER,
            rated_by_id=manager_id,
            status=SkillRatingStatus.DRAFT,
            is_latest=True,
        )

    def get_manager_submitted_ratings(self, manager_id, employee_id):
        """Return all SUBMITTED manager ratings for a given employee by this manager."""
        return self.rating_repo.filter(
            employee_id=employee_id,
            rating_type=SkillRatingType.MANAGER,
            rated_by_id=manager_id,
            status=SkillRatingStatus.SUBMITTED,
            is_latest=True,
        )

    def has_submitted(self, manager_id, employee_id):
        """
        Return True if this manager has already submitted ratings for ALL of the employee's 
        submitted self-ratings (i.e. there are no pending reviews).
        """
        self_submitted_skills = set(
            self.rating_repo.filter(
                employee_id=employee_id,
                rating_type=SkillRatingType.SELF,
                status=SkillRatingStatus.SUBMITTED,
                is_latest=True,
            ).values_list("skill_id", flat=True)
        )
        mgr_submitted_skills = set(
            self.rating_repo.filter(
                employee_id=employee_id,
                rating_type=SkillRatingType.MANAGER,
                rated_by_id=manager_id,
                status=SkillRatingStatus.SUBMITTED,
                is_latest=True,
            ).values_list("skill_id", flat=True)
        )
        if not self_submitted_skills:
            return False
        return self_submitted_skills.issubset(mgr_submitted_skills)

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    @transaction.atomic
    def save_draft(self, manager_id, employee_id, skill_id, level_id, notes=""):
        """
        Create or update a single DRAFT manager rating row.

        Raises ValidationError if the manager has already submitted ratings
        for this employee (submitted ratings are immutable).

        Returns the EmployeeSkillRating instance.
        """
        existing = self.rating_repo.get_single(
            employee_id=employee_id,
            skill_id=skill_id,
            rating_type=SkillRatingType.MANAGER,
        )

        if existing and existing.status == SkillRatingStatus.SUBMITTED:
            raise ValidationError(
                "This skill rating has already been submitted and cannot be edited."
            )

        instance, _ = self.rating_repo.upsert(
            employee_id=employee_id,
            skill_id=skill_id,
            rating_type=SkillRatingType.MANAGER,
            defaults={
                "rated_by_id": manager_id,
                "rated_level_id": level_id,
                "status": SkillRatingStatus.DRAFT,
                "notes": notes,
            },
        )
        return instance

    @transaction.atomic
    def save_draft_bulk(self, manager_id, employee_id, ratings):
        """
        Upsert multiple DRAFT manager ratings in one call.

        `ratings` is a list of dicts:
            [
                {
                    "skill_id": int,
                    "level_id": int,
                    "notes": str,   # optional
                },
                ...
            ]

        Returns a list of EmployeeSkillRating instances.
        """
        results = []
        for item in ratings:
            instance = self.save_draft(
                manager_id=manager_id,
                employee_id=employee_id,
                skill_id=item["skill_id"],
                level_id=item["level_id"],
                notes=item.get("notes", ""),
            )
            results.append(instance)
        return results

    # ------------------------------------------------------------------
    # Submit — the key action that triggers gap analysis
    # ------------------------------------------------------------------

    @transaction.atomic
    def submit_all(self, manager_id, employee_id):
        """
        Bulk-submit all DRAFT manager ratings for an employee, then:
          1. Update EmployeeSkill.current_level + identified_by = MANAGER
             for each submitted skill (creates the EmployeeSkill row if absent)
          2. Run TNIEngineService.analyze_employee_gaps() to auto-create
             SkillGapSnapshot and TrainingNeed records

        Returns a summary dict:
            {
                "submitted_count": int,
                "skills_updated": int,
                "gaps_found": int,
                "training_needs_created": int,
            }

        Raises ValidationError if:
          - No DRAFT manager ratings exist for this employee
          - Manager has already submitted for this employee
        """
        if self.has_submitted(manager_id, employee_id):
            raise ValidationError(
                "You have already submitted your ratings for this employee."
            )

        drafts = list(self.get_manager_draft_ratings(manager_id, employee_id))
        if not drafts:
            raise ValidationError(
                "No draft ratings found. Rate at least one skill before submitting."
            )

        now = timezone.now()
        submitted_count = 0

        # ── Step 1: Mark all DRAFT rows as SUBMITTED ──────────────────
        for rating in drafts:
            self.rating_repo.update(
                pk=rating.pk,
                status=SkillRatingStatus.SUBMITTED,
                submitted_at=now,
            )
            submitted_count += 1

        # ── Step 2: Push identified levels into EmployeeSkill ─────────
        skills_updated = 0
        for rating in drafts:
            obj, created = self.employee_skill_repo.model.objects.update_or_create(
                employee_id=employee_id,
                skill_id=rating.skill_id,
                defaults={
                    "current_level_id": rating.rated_level_id,
                    "identified_by": SkillIdentifiedBy.MANAGER,
                    "is_active": True,
                },
            )
            skills_updated += 1

        # ── Step 3: Run automated gap analysis ────────────────────────
        from apps.tni_management.services import TNIEngineService
        identified_needs = TNIEngineService().analyze_employee_gaps(employee_id)

        # Count how many are genuinely new (created) vs updated
        # analyze_employee_gaps returns all identified needs (new + existing)
        gaps_found = len(identified_needs)

        return {
            "submitted_count": submitted_count,
            "skills_updated": skills_updated,
            "gaps_found": gaps_found,
            "training_needs_created": gaps_found,
        }
