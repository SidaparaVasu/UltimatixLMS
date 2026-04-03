from common.repositories.base import BaseRepository
from ..models import (
    TrainingNeed,
    SkillGapSnapshot,
    ComplianceTrainingRequirement,
    TrainingNeedApproval,
    TrainingNeedCourseRecommendation,
    TNIAggregatedAnalysis
)
from ..constants import TNIStatus


class TrainingNeedRepository(BaseRepository[TrainingNeed]):
    """
    Handles all data access for identified training needs.
    """
    model = TrainingNeed

    def get_pending_needs(self, employee_id=None):
        """Fetch identified needs that haven't been planned or completed."""
        filters = {"status": TNIStatus.PENDING, "is_active": True}
        if employee_id:
            filters["employee_id"] = employee_id
        return self.filter(**filters)

    def get_needs_by_source(self, source_type):
        """Fetch needs identified by a specific source (e.g., SKILL_GAP)."""
        return self.filter(source_type=source_type, is_active=True)


class SkillGapSnapshotRepository(BaseRepository[SkillGapSnapshot]):
    """
    Handles snapshots captured during skill gap analysis.
    """
    model = SkillGapSnapshot

    def get_latest_gap(self, employee_id, skill_id):
        """Retrieve the most recent gap detected for a specific employee skill."""
        return self.filter(
            employee_id=employee_id, 
            skill_id=skill_id, 
            is_active=True
        ).order_by("-detected_at").first()


class ComplianceRequirementRepository(BaseRepository[ComplianceTrainingRequirement]):
    """
    Handles data access for mandatory training rules by job role.
    """
    model = ComplianceTrainingRequirement

    def get_role_mandatory_courses(self, job_role_id):
        """Fetch all mandatory course IDs for a specific job role."""
        return self.filter(
            job_role_id=job_role_id, 
            mandatory=True, 
            is_active=True
        ).values_list("course_id", flat=True)


class TNIApprovalRepository(BaseRepository[TrainingNeedApproval]):
    """
    Handles auditing and tracking of TNI management approvals.
    """
    model = TrainingNeedApproval

    def get_history(self, training_need_id):
        """Fetch the approval trail for a specific training need."""
        return self.filter(training_need_id=training_need_id).order_by("-created_at")


class TNICourseRecommendationRepository(BaseRepository[TrainingNeedCourseRecommendation]):
    """
    Handles course mapping logic for training needs.
    """
    model = TrainingNeedCourseRecommendation


class TNIAnalysisRepository(BaseRepository[TNIAggregatedAnalysis]):
    """
    Handles persistence for operational TNI analytics.
    """
    model = TNIAggregatedAnalysis

    def get_latest_for_department(self, department_id):
        """Fetch the most recent organizational analysis for a department."""
        return self.filter(department_id=department_id).order_by("-generated_at").first()
