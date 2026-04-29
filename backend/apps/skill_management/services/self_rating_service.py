"""
SelfRatingService

Handles the employee self-rating workflow within the TNI cycle:
  - Save / update draft ratings (one per employee-skill pair)
  - Validate that all job-role-required skills are rated before submission
  - Bulk-submit all DRAFT ratings for the current user

The service never touches the ORM directly — all DB access goes through
EmployeeSkillRatingRepository and JobRoleSkillRepository.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..repositories import (
    EmployeeSkillRatingRepository,
    JobRoleSkillRepository,
)
from ..models import SkillRatingType, SkillRatingStatus


class SelfRatingService:
    """
    Manages the employee self-rating step of the TNI cycle.
    """

    def __init__(self):
        self.rating_repo = EmployeeSkillRatingRepository()
        self.role_skill_repo = JobRoleSkillRepository()

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    def get_draft_ratings(self, employee_id):
        """Return all DRAFT self-ratings for an employee."""
        return self.rating_repo.get_for_employee(
            employee_id=employee_id,
            rating_type=SkillRatingType.SELF,
            status=SkillRatingStatus.DRAFT,
        )

    def get_submitted_ratings(self, employee_id):
        """Return all SUBMITTED self-ratings for an employee."""
        return self.rating_repo.get_for_employee(
            employee_id=employee_id,
            rating_type=SkillRatingType.SELF,
            status=SkillRatingStatus.SUBMITTED,
        )

    def get_all_ratings(self, employee_id):
        """Return all self-ratings (any status) for an employee."""
        return self.rating_repo.get_for_employee(
            employee_id=employee_id,
            rating_type=SkillRatingType.SELF,
        )

    # ------------------------------------------------------------------
    # Write helpers
    # ------------------------------------------------------------------

    @transaction.atomic
    def save_draft(
        self,
        employee_id,
        skill_id,
        level_id,
        rated_by_id,
        observations="",
        accomplishments="",
    ):
        """
        Create or update a single DRAFT self-rating row.

        Raises ValidationError if the rating has already been submitted
        (submitted ratings are immutable).

        Returns the EmployeeSkillRating instance.
        """
        existing = self.rating_repo.get_single(
            employee_id=employee_id,
            skill_id=skill_id,
            rating_type=SkillRatingType.SELF,
        )

        if existing and existing.status == SkillRatingStatus.SUBMITTED:
            raise ValidationError(
                "This skill rating has already been submitted and cannot be edited."
            )

        instance, _ = self.rating_repo.upsert(
            employee_id=employee_id,
            skill_id=skill_id,
            rating_type=SkillRatingType.SELF,
            defaults={
                "rated_by_id": rated_by_id,
                "rated_level_id": level_id,
                "status": SkillRatingStatus.DRAFT,
                "observations": observations,
                "accomplishments": accomplishments,
            },
        )
        return instance

    @transaction.atomic
    def save_draft_bulk(self, employee_id, rated_by_id, ratings):
        """
        Upsert multiple DRAFT self-ratings in one call.

        `ratings` is a list of dicts:
            [
                {
                    "skill_id": int,
                    "level_id": int,
                    "observations": str,   # optional
                    "accomplishments": str, # optional
                },
                ...
            ]

        Returns a list of EmployeeSkillRating instances.
        """
        results = []
        for item in ratings:
            instance = self.save_draft(
                employee_id=employee_id,
                skill_id=item["skill_id"],
                level_id=item["level_id"],
                rated_by_id=rated_by_id,
                observations=item.get("observations", ""),
                accomplishments=item.get("accomplishments", ""),
            )
            results.append(instance)
        return results

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_submittable(self, employee_id, job_role_id):
        """
        Check that every job-role-required skill has a DRAFT rating before
        the employee is allowed to submit.

        Returns a dict:
            {
                "valid": bool,
                "missing_skill_ids": [int, ...]   # empty if valid
            }
        """
        required_skill_ids = set(
            self.role_skill_repo.filter(
                job_role_id=job_role_id,
                is_active=True,
            ).values_list("skill_id", flat=True)
        )

        rated_skill_ids = set(
            self.rating_repo.get_for_employee(
                employee_id=employee_id,
                rating_type=SkillRatingType.SELF,
            ).values_list("skill_id", flat=True)
        )

        missing = required_skill_ids - rated_skill_ids
        return {
            "valid": len(missing) == 0,
            "missing_skill_ids": list(missing),
        }

    # ------------------------------------------------------------------
    # Submit
    # ------------------------------------------------------------------

    @transaction.atomic
    def submit_all(self, employee_id, job_role_id):
        """
        Bulk-submit all DRAFT self-ratings for an employee.

        Validates that all job-role-required skills are rated first.
        Sets status → SUBMITTED and records submitted_at timestamp.

        If the employee has no direct reporting manager, the manager review
        step is automatically bypassed: self-rated levels are pushed directly
        into EmployeeSkill (identified_by=SELF) and gap analysis runs immediately.

        Returns a dict:
            {
                "submitted": [EmployeeSkillRating, ...],
                "bypassed_manager_review": bool,
                "gaps_found": int,          # only set when bypassed
                "training_needs_created": int,  # only set when bypassed
            }

        Raises ValidationError if:
          - No DRAFT ratings exist
          - Required skills are missing a rating
        """
        # 1. Validate completeness
        check = self.validate_submittable(employee_id, job_role_id)
        if not check["valid"]:
            raise ValidationError(
                {
                    "detail": "Cannot submit — some required skills have not been rated.",
                    "missing_skill_ids": check["missing_skill_ids"],
                }
            )

        # 2. Fetch all DRAFT rows
        drafts = list(self.get_draft_ratings(employee_id))
        if not drafts:
            raise ValidationError(
                "No draft ratings found. Rate at least one skill before submitting."
            )

        # 3. Mark each as SUBMITTED
        now = timezone.now()
        submitted = []
        for rating in drafts:
            updated = self.rating_repo.update(
                pk=rating.pk,
                status=SkillRatingStatus.SUBMITTED,
                submitted_at=now,
            )
            submitted.append(updated)

        # 4. Check if employee has a direct reporting manager
        has_manager = self._has_direct_manager(employee_id)

        if has_manager:
            # Normal flow — manager will review and trigger gap analysis
            return {
                "submitted": submitted,
                "bypassed_manager_review": False,
                "gaps_found": 0,
                "training_needs_created": 0,
            }

        # 5. No manager — auto-bypass: push self-rated levels and run gap analysis
        from ..repositories import EmployeeSkillRepository
        from ..models import SkillIdentifiedBy
        from apps.tni_management.services import TNIEngineService

        emp_skill_repo = EmployeeSkillRepository()
        for rating in submitted:
            emp_skill_repo.model.objects.update_or_create(
                employee_id=employee_id,
                skill_id=rating.skill_id,
                defaults={
                    "current_level_id": rating.rated_level_id,
                    "identified_by": SkillIdentifiedBy.SELF,
                    "is_active": True,
                },
            )

        identified_needs = TNIEngineService().analyze_employee_gaps(employee_id)

        return {
            "submitted": submitted,
            "bypassed_manager_review": True,
            "gaps_found": len(identified_needs),
            "training_needs_created": len(identified_needs),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _has_direct_manager(self, employee_id):
        """
        Returns True if the employee has at least one active direct reporting
        manager set in EmployeeReportingManager.
        """
        from apps.org_management.models import EmployeeReportingManager
        return EmployeeReportingManager.objects.filter(
            employee_id=employee_id,
            relationship_type="DIRECT",
        ).exists()
