from django.db import transaction
from django.utils import timezone
from common.services.base import BaseService
from ..repositories import (
    TrainingNeedRepository,
    SkillGapSnapshotRepository,
    ComplianceRequirementRepository,
    TNIApprovalRepository,
    TNICourseRecommendationRepository,
    TNIAnalysisRepository
)
from ..constants import TNISourceType, TNIPriority, TNIStatus, TNIApprovalStatus
from apps.skill_management.repositories import EmployeeSkillRepository, JobRoleSkillRepository


class TrainingNeedService(BaseService):
    repository_class = TrainingNeedRepository


class SkillGapSnapshotService(BaseService):
    repository_class = SkillGapSnapshotRepository


class ComplianceRequirementService(BaseService):
    repository_class = ComplianceRequirementRepository


class TNIApprovalService(BaseService):
    repository_class = TNIApprovalRepository

    @transaction.atomic
    def process_approval(self, approval_id, status, comments, approver_id):
        """Finalizes an approval step and updates the parent training need status."""
        approval = self.repository.get_by_id(approval_id)
        if not approval:
            return None

        # Update approval record
        self.repository.update(
            pk=approval_id,
            approval_status=status,
            comments=comments,
            approved_at=timezone.now()
        )

        # Update parent training need
        tni_repo = TrainingNeedRepository()
        new_tni_status = TNIStatus.APPROVED if status == TNIApprovalStatus.APPROVED else TNIStatus.REJECTED
        tni_repo.update(pk=approval.training_need_id, status=new_tni_status)

        return approval


class TNICourseRecommendationService(BaseService):
    repository_class = TNICourseRecommendationRepository


class TNIAnalysisService(BaseService):
    repository_class = TNIAnalysisRepository


class TNIEngineService:
    """
    Business logic engine for automated Training Needs Identification.
    Orchestrates multiple repositories and services to detect gaps and compliance needs.
    """

    def __init__(self):
        self.tni_repo = TrainingNeedRepository()
        self.gap_repo = SkillGapSnapshotRepository()
        self.employee_skill_repo = EmployeeSkillRepository()
        self.role_skill_repo = JobRoleSkillRepository()
        self.compliance_repo = ComplianceRequirementRepository()

    @transaction.atomic
    def analyze_employee_gaps(self, employee_id, company_id=None):
        """
        Main engine logic: Compares actual employee skills with role-based requirements.
        Generates snapshots and identifies training needs.
        """
        # 1. Fetch employee skills & role requirements
        # Note: This requires access to EmployeeMaster to get job_role_id
        from apps.org_management.models import EmployeeMaster
        employee = EmployeeMaster.objects.filter(id=employee_id).first()
        if not employee or not employee.job_role_id:
            return []

        actual_skills = {
            s.skill_id: s.current_level.level_rank 
            for s in self.employee_skill_repo.filter(employee_id=employee_id, is_active=True)
        }
        
        required_skills = self.role_skill_repo.filter(
            job_role_id=employee.job_role_id, 
            is_active=True
        )

        identified_needs = []

        for req in required_skills:
            skill_id = req.skill_id
            target_rank = req.required_level.level_rank
            actual_rank = actual_skills.get(skill_id, 0) # 0 if not possessed at all

            if actual_rank < target_rank:
                gap = target_rank - actual_rank
                priority = TNIPriority.HIGH if gap >= 2 else TNIPriority.MEDIUM

                # Calculate current level for snapshot (if exists)
                current_level_id = None
                emp_skill = self.employee_skill_repo.filter(
                    employee_id=employee_id, 
                    skill_id=skill_id
                ).first()
                if emp_skill:
                    current_level_id = emp_skill.current_level_id

                # Create Snapshot
                self.gap_repo.create(
                    employee_id=employee_id,
                    skill_id=skill_id,
                    required_level_id=req.required_level_id,
                    current_level_id=current_level_id,
                    gap_value=gap
                )

                # Create or update Training Need
                tni, created = self.tni_repo.model.objects.update_or_create(
                    employee_id=employee_id,
                    skill_id=skill_id,
                    is_active=True,
                    defaults={
                        "source_type": TNISourceType.SKILL_GAP,
                        "priority": priority,
                        "status": TNIStatus.PENDING,
                        "notes": f"Auto-detected gap of {gap} levels."
                    }
                )
                identified_needs.append(tni)

        return identified_needs
