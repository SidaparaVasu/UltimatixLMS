from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from apps.rbac.permission_codes import P
from .models import (
    SkillCategoryMaster,
    SkillMaster,
    SkillCategorySkillMap,
    SkillLevelMaster,
    JobRoleSkillRequirement,
    EmployeeSkill,
    EmployeeSkillHistory,
    EmployeeSkillAssessment,
    EmployeeSkillRating,
    EmployeeSkillRatingHistory,
)
from .serializers import (
    SkillCategorySerializer,
    SkillMasterSerializer,
    SkillCategoryMappingSerializer,
    SkillLevelSerializer,
    SkillDetailSerializer,
    EmployeeSkillSerializer,
    EmployeeSkillHistorySerializer,
    EmployeeSkillAssessmentSerializer,
    EmployeeSkillBulkSyncSerializer,
    JobRoleSkillBulkSyncSerializer,
    JobRoleSkillRequirementSerializer,
    EmployeeSkillRatingSerializer,
    EmployeeSkillRatingHistorySerializer,
    SkillMatrixRowSerializer,
    ManagerReviewRowSerializer,
    SelfRatingBulkSaveSerializer,
    ManagerRatingSubmitSerializer,
)
from .services import (
    SkillCategoryService,
    SkillService,
    SkillCategoryMappingService,
    SkillLevelService,
    JobRoleSkillService,
    EmployeeSkillService,
    EmployeeSkillHistoryService,
    EmployeeSkillAssessmentService,
    SelfRatingService,
    ManagerRatingService,
)


class BaseSkillViewSet(viewsets.ModelViewSet):
    """
    Standardizes CRUD response logic for the Skill Management module.
    """
    service_class = None
    model = None
    permission_classes = [HasScopedPermission]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
             serializer = self.get_serializer(page, many=True)
             return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(**serializer.validated_data)
        return created_response(
            message=f"{self.model._meta.verbose_name} created successfully.",
            data=self.get_serializer(instance).data
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, partial=False, **serializer.validated_data)
        return success_response(
            message=f"{self.model._meta.verbose_name} updated successfully.",
            data=self.get_serializer(updated).data
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, partial=True, **serializer.validated_data)
        return success_response(
            message=f"{self.model._meta.verbose_name} partially updated successfully.",
            data=self.get_serializer(updated).data
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(name="soft_delete", type=bool, description="Set to false for hard delete (default is true)")
        ]
    )
    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        soft_delete = request.query_params.get("soft_delete", "true").lower() == "true"
        self.service_class().delete(pk=pk, soft_delete=soft_delete)
        msg = f"{self.model._meta.verbose_name} deleted successfully."
        return success_response(message=msg)


class SkillCategoryViewSet(BaseSkillViewSet):
    queryset = SkillCategoryMaster.objects.all()
    serializer_class = SkillCategorySerializer
    service_class = SkillCategoryService
    model = SkillCategoryMaster
    required_permission = P.CONTENT_MANAGEMENT.SKILL_CATEGORY_MANAGE


class SkillMasterViewSet(BaseSkillViewSet):
    queryset = SkillMaster.objects.all()
    serializer_class = SkillMasterSerializer
    service_class = SkillService
    model = SkillMaster
    required_permission = P.CONTENT_MANAGEMENT.SKILL_MANAGE

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SkillDetailSerializer
        return SkillMasterSerializer


class SkillCategoryMappingViewSet(BaseSkillViewSet):
    queryset = SkillCategorySkillMap.objects.all()
    serializer_class = SkillCategoryMappingSerializer
    service_class = SkillCategoryMappingService
    model = SkillCategorySkillMap
    required_permission = P.CONTENT_MANAGEMENT.SKILL_MAPPING_MANAGE


class SkillLevelViewSet(BaseSkillViewSet):
    queryset = SkillLevelMaster.objects.all()
    serializer_class = SkillLevelSerializer
    service_class = SkillLevelService
    model = SkillLevelMaster
    required_permission = P.CONTENT_MANAGEMENT.SKILL_MANAGE  # skill level management is part of skill management


class JobRoleSkillRequirementViewSet(BaseSkillViewSet):
    queryset = JobRoleSkillRequirement.objects.all()
    serializer_class = JobRoleSkillRequirementSerializer
    service_class = JobRoleSkillService
    model = JobRoleSkillRequirement
    required_permission = P.CONTENT_MANAGEMENT.SKILL_MAPPING_MANAGE  # job role skill requirements are skill mappings

    @action(detail=False, methods=['post'], url_path='bulk-sync')
    def bulk_sync(self, request):
        serializer = JobRoleSkillBulkSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        results = self.service_class().bulk_sync_requirements(**serializer.validated_data)
        
        return success_response(
            message="Job role skills updated successfully.",
            data=self.get_serializer(results, many=True).data
        )


class EmployeeSkillViewSet(BaseSkillViewSet):
    queryset = EmployeeSkill.objects.all()
    serializer_class = EmployeeSkillSerializer
    service_class = EmployeeSkillService
    model = EmployeeSkill
    required_permission = P.HR_MANAGEMENT.EMPLOYEE_MANAGE  # employee skill updates require HR manage access

    @action(detail=False, methods=['post'], url_path='bulk-sync')
    def bulk_sync(self, request):
        serializer = EmployeeSkillBulkSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        results = self.service_class().bulk_sync_skills(**serializer.validated_data)
        
        return success_response(
            message="Employee skills updated successfully.",
            data=self.get_serializer(results, many=True).data
        )


class EmployeeSkillHistoryViewSet(BaseSkillViewSet):
    """
    History is read-only for employees/managers, usually generated via signals.
    """
    queryset = EmployeeSkillHistory.objects.all()
    serializer_class = EmployeeSkillHistorySerializer
    service_class = EmployeeSkillHistoryService
    model = EmployeeSkillHistory
    required_permission = P.HR_MANAGEMENT.EMPLOYEE_VIEW  # skill history is a read-only view
    http_method_names = ["get"]


class EmployeeSkillAssessmentViewSet(BaseSkillViewSet):
    queryset = EmployeeSkillAssessment.objects.all()
    serializer_class = EmployeeSkillAssessmentSerializer
    service_class = EmployeeSkillAssessmentService
    model = EmployeeSkillAssessment
    required_permission = P.CONTENT_MANAGEMENT.ASSESSMENT_MANAGE


# ---------------------------------------------------------------------------
# Helper: resolve EmployeeMaster from request.user
# ---------------------------------------------------------------------------

def _get_employee_or_error(user):
    """
    Returns (employee, None) on success or (None, error_response) on failure.
    Avoids repeating this lookup in every action.
    """
    from apps.org_management.models import EmployeeMaster
    employee = EmployeeMaster.objects.filter(user=user).first()
    if not employee:
        return None, error_response(message="Employee profile not found for the current user.")
    return employee, None


# ---------------------------------------------------------------------------
# EmployeeSkillRatingViewSet
# ---------------------------------------------------------------------------

class EmployeeSkillRatingViewSet(viewsets.GenericViewSet):
    """
    Handles the TNI self-rating and manager-rating workflow.

    Endpoints:
      GET    /skills/skill-ratings/              — list ratings (filtered by query params)
      POST   /skills/skill-ratings/save-draft/   — bulk upsert DRAFT self-ratings
      POST   /skills/skill-ratings/submit/       — bulk submit all DRAFT self-ratings
      POST   /skills/skill-ratings/manager-save/ — bulk upsert DRAFT manager ratings
      POST   /skills/skill-ratings/manager-submit/ — submit manager ratings + run gap analysis
      GET    /skills/skill-ratings/history/      — rating history for an employee
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = EmployeeSkillRatingSerializer

    def get_queryset(self):
        return EmployeeSkillRating.objects.select_related(
            "employee", "skill", "rated_by", "rated_level"
        ).all()

    # ── List ──────────────────────────────────────────────────────────────
    @extend_schema(
        parameters=[
            OpenApiParameter("employee_id",  int,  description="Filter by employee ID"),
            OpenApiParameter("rating_type",  str,  description="SELF or MANAGER"),
            OpenApiParameter("status",       str,  description="DRAFT or SUBMITTED"),
        ]
    )
    def list(self, request):
        from .repositories import EmployeeSkillRatingRepository
        repo = EmployeeSkillRatingRepository()

        employee_id = request.query_params.get("employee_id")
        rating_type = request.query_params.get("rating_type")
        status_val  = request.query_params.get("status")

        # Default: show the current user's own ratings
        if not employee_id:
            employee, err = _get_employee_or_error(request.user)
            if err:
                return err
            employee_id = employee.id

        qs = repo.get_for_employee(
            employee_id=employee_id,
            rating_type=rating_type,
            status=status_val,
        ).select_related("skill", "rated_level", "rated_by")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return success_response(data=serializer.data)

    # ── Team pending review (manager) ────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="team-pending-review")
    def team_pending_review(self, request):
        """
        Returns direct reports who have submitted self-ratings
        and are awaiting manager review (no submitted manager rating yet).
        """
        manager, err = _get_employee_or_error(request.user)
        if err:
            return err

        service = ManagerRatingService()
        employees = service.get_pending_review_employees(manager_id=manager.id)

        from apps.org_management.serializers import EmployeeManagerOptionSerializer
        serializer = EmployeeManagerOptionSerializer(employees, many=True)
        return success_response(data=serializer.data)

    # ── All direct reports who have submitted self-ratings ────────────────
    @action(detail=False, methods=["get"], url_path="team-submitted")
    def team_submitted(self, request):
        """
        Returns ALL direct reports who have submitted a self-rating,
        regardless of whether the manager has reviewed them yet.
        Used to populate the employee selector in the manager review page.
        """
        manager, err = _get_employee_or_error(request.user)
        if err:
            return err

        from apps.org_management.models import EmployeeReportingManager, EmployeeMaster
        from .models import SkillRatingType, SkillRatingStatus

        direct_report_ids = EmployeeReportingManager.objects.filter(
            manager_id=manager.id,
            relationship_type="DIRECT",
        ).values_list("employee_id", flat=True)

        employees_with_self_rating = (
            EmployeeSkillRating.objects.filter(
                employee_id__in=direct_report_ids,
                rating_type=SkillRatingType.SELF,
                status=SkillRatingStatus.SUBMITTED,
            )
            .values_list("employee_id", flat=True)
            .distinct()
        )

        employees = EmployeeMaster.objects.filter(id__in=employees_with_self_rating)

        from apps.org_management.serializers import EmployeeManagerOptionSerializer
        serializer = EmployeeManagerOptionSerializer(employees, many=True)
        return success_response(data=serializer.data)

    # ── Manager review matrix ─────────────────────────────────────────────
    @extend_schema(
        parameters=[OpenApiParameter("employee_id", int, description="Employee ID to review", required=True)]
    )
    @action(detail=False, methods=["get"], url_path="manager-review-matrix")
    def manager_review_matrix(self, request):
        """
        Composite review matrix for a manager reviewing a specific employee.

        Returns one row per skill the employee has self-rated, enriched with:
          - required level from the employee's job role
          - full self-rating (including observations + accomplishments)
          - manager's existing rating for this skill (null if not yet rated)
          - category grouping
          - is_role_skill flag

        Query param: ?employee_id=<int>  (required)
        """
        from apps.org_management.models import EmployeeMaster
        from .models import (
            JobRoleSkillRequirement,
            SkillCategorySkillMap,
            SkillRatingType,
            SkillRatingStatus,
        )
        from .serializers import ManagerReviewRowSerializer

        employee_id = request.query_params.get("employee_id")
        if not employee_id:
            return error_response(message="employee_id query parameter is required.")

        try:
            employee_id = int(employee_id)
        except (TypeError, ValueError):
            return error_response(message="employee_id must be an integer.")

        employee = EmployeeMaster.objects.filter(id=employee_id).first()
        if not employee:
            return error_response(message="Employee not found.")

        # 1. All SUBMITTED self-ratings for this employee
        self_ratings = {
            r.skill_id: r
            for r in EmployeeSkillRating.objects.filter(
                employee_id=employee_id,
                rating_type=SkillRatingType.SELF,
                status=SkillRatingStatus.SUBMITTED,
            ).select_related("skill", "rated_level")
        }

        if not self_ratings:
            return success_response(data=[])

        # 2. Manager's existing ratings for this employee (any status)
        manager_ratings = {
            r.skill_id: r
            for r in EmployeeSkillRating.objects.filter(
                employee_id=employee_id,
                rating_type=SkillRatingType.MANAGER,
            ).select_related("rated_level")
        }

        # 3. Required levels from job role — keyed by skill_id
        role_requirements = {
            req.skill_id: req.required_level
            for req in JobRoleSkillRequirement.objects.filter(
                job_role_id=employee.job_role_id,
                is_active=True,
            ).select_related("required_level")
        } if employee.job_role_id else {}

        # 4. Category mapping for all self-rated skills
        all_skill_ids = list(self_ratings.keys())
        category_map = {}
        for mapping in SkillCategorySkillMap.objects.filter(
            skill_id__in=all_skill_ids,
            is_active=True,
        ).select_related("category"):
            if mapping.skill_id not in category_map:
                category_map[mapping.skill_id] = mapping.category

        # 5. Assemble rows — one per self-rated skill
        rows = []
        for skill_id, self_rating in self_ratings.items():
            skill         = self_rating.skill
            required_lvl  = role_requirements.get(skill_id)
            manager_rating = manager_ratings.get(skill_id)
            category      = category_map.get(skill_id)

            rows.append({
                "skill_id":       skill.id,
                "skill_name":     skill.skill_name,
                "skill_code":     skill.skill_code,
                "category_id":    category.id if category else None,
                "category_name":  category.category_name if category else None,
                "is_role_skill":  skill_id in role_requirements,
                "required_level": required_lvl,
                "self_rating":    self_rating,
                "manager_rating": manager_rating,
            })

        # Sort: role skills first, then alphabetically by skill name
        rows.sort(key=lambda r: (not r["is_role_skill"], r["skill_name"]))

        serializer = ManagerReviewRowSerializer(rows, many=True)
        return success_response(data=serializer.data)

    # ── Save draft (self) ─────────────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="save-draft")
    def save_draft(self, request):
        """Bulk upsert DRAFT self-ratings for the current user."""
        employee, err = _get_employee_or_error(request.user)
        if err:
            return err

        serializer = SelfRatingBulkSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = SelfRatingService()
        results = service.save_draft_bulk(
            employee_id=employee.id,
            rated_by_id=employee.id,
            ratings=serializer.validated_data["ratings"],
        )
        return success_response(
            message=f"{len(results)} skill rating(s) saved as draft.",
            data=EmployeeSkillRatingSerializer(results, many=True).data,
        )

    # ── Submit (self) ─────────────────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="submit")
    def submit(self, request):
        """
        Bulk submit all DRAFT self-ratings for the current user.

        If the employee has no direct reporting manager, the manager review
        step is automatically bypassed: self-rated levels are pushed into
        EmployeeSkill and gap analysis runs immediately.
        """
        employee, err = _get_employee_or_error(request.user)
        if err:
            return err

        service = SelfRatingService()
        result = service.submit_all(
            employee_id=employee.id,
            job_role_id=employee.job_role_id,
        )

        submitted = result["submitted"]
        bypassed  = result["bypassed_manager_review"]

        if bypassed:
            message = (
                f"{len(submitted)} skill rating(s) submitted. "
                f"No reporting manager found — gap analysis ran automatically. "
                f"{result['gaps_found']} gap(s) found, "
                f"{result['training_needs_created']} training need(s) created."
            )
        else:
            message = (
                f"{len(submitted)} skill rating(s) submitted successfully. "
                f"Awaiting manager review."
            )

        return success_response(
            message=message,
            data={
                "ratings": EmployeeSkillRatingSerializer(submitted, many=True).data,
                "bypassed_manager_review": bypassed,
                "gaps_found": result["gaps_found"],
                "training_needs_created": result["training_needs_created"],
            },
        )

    # ── Save draft (manager) ──────────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="manager-save")
    def manager_save(self, request):
        """Bulk upsert DRAFT manager ratings for a given employee."""
        manager, err = _get_employee_or_error(request.user)
        if err:
            return err

        serializer = ManagerRatingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ManagerRatingService()
        results = service.save_draft_bulk(
            manager_id=manager.id,
            employee_id=serializer.validated_data["employee_id"],
            ratings=serializer.validated_data["ratings"],
        )
        return success_response(
            message=f"{len(results)} manager rating(s) saved as draft.",
            data=EmployeeSkillRatingSerializer(results, many=True).data,
        )

    # ── Submit (manager) — triggers gap analysis ──────────────────────────
    @action(detail=False, methods=["post"], url_path="manager-submit")
    def manager_submit(self, request):
        """
        Submit manager ratings for an employee.
        Pushes identified levels into EmployeeSkill and runs gap analysis.
        Returns a summary of gaps found and training needs created.
        """
        manager, err = _get_employee_or_error(request.user)
        if err:
            return err

        serializer = ManagerRatingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data["employee_id"]

        # Save any ratings included in this request first
        if serializer.validated_data.get("ratings"):
            ManagerRatingService().save_draft_bulk(
                manager_id=manager.id,
                employee_id=employee_id,
                ratings=serializer.validated_data["ratings"],
            )

        # Then submit all drafts and run gap analysis
        service = ManagerRatingService()
        summary = service.submit_all(
            manager_id=manager.id,
            employee_id=employee_id,
        )
        return success_response(
            message=(
                f"Ratings submitted. "
                f"{summary['gaps_found']} gap(s) found, "
                f"{summary['training_needs_created']} training need(s) created."
            ),
            data=summary,
        )

    # ── Rating history ────────────────────────────────────────────────────
    @extend_schema(
        parameters=[
            OpenApiParameter("employee_id",  int, description="Employee ID (defaults to current user)"),
            OpenApiParameter("rating_type",  str, description="SELF or MANAGER"),
            OpenApiParameter("skill_id",     int, description="Filter by skill"),
        ]
    )
    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        """Return rating history for an employee."""
        from .repositories import EmployeeSkillRatingHistoryRepository
        repo = EmployeeSkillRatingHistoryRepository()

        employee_id = request.query_params.get("employee_id")
        if not employee_id:
            employee, err = _get_employee_or_error(request.user)
            if err:
                return err
            employee_id = employee.id

        qs = repo.get_for_employee(
            employee_id=employee_id,
            rating_type=request.query_params.get("rating_type"),
            skill_id=request.query_params.get("skill_id"),
        ).select_related("skill", "old_level", "new_level", "rated_by")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = EmployeeSkillRatingHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = EmployeeSkillRatingHistorySerializer(qs, many=True)
        return success_response(data=serializer.data)


# ---------------------------------------------------------------------------
# SkillMatrixViewSet
# ---------------------------------------------------------------------------

class SkillMatrixViewSet(viewsets.GenericViewSet):
    """
    Read-only composite view that assembles the skill matrix for an employee.

    GET /skills/my-skill-matrix/
        Returns all job-role-required skills for the current user, enriched with:
          - required level (from JobRoleSkillRequirement)
          - current level + identified_by (from EmployeeSkill)
          - self-rating (from EmployeeSkillRating SELF)
          - manager-rating (from EmployeeSkillRating MANAGER)
          - gap_value and gap_severity
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = SkillMatrixRowSerializer

    @extend_schema(responses={200: SkillMatrixRowSerializer(many=True)})
    def list(self, request):
        employee, err = _get_employee_or_error(request.user)
        if err:
            return err

        rows = self._build_matrix(employee)
        serializer = self.get_serializer(rows, many=True)
        return success_response(data=serializer.data)

    # ── Internal builder ──────────────────────────────────────────────────

    def _build_matrix(self, employee):
        from .models import (
            JobRoleSkillRequirement,
            EmployeeSkill,
            EmployeeSkillRating,
            SkillCategorySkillMap,
            SkillRatingType,
        )

        # 1. Required skills for this job role
        requirements = (
            JobRoleSkillRequirement.objects
            .filter(job_role_id=employee.job_role_id, is_active=True)
            .select_related("skill", "required_level")
        )

        # 2. Current finalized skills keyed by skill_id
        current_skills = {
            es.skill_id: es
            for es in EmployeeSkill.objects.filter(
                employee=employee, is_active=True
            ).select_related("current_level")
        }

        # 3. Self-ratings keyed by skill_id
        self_ratings = {
            r.skill_id: r
            for r in EmployeeSkillRating.objects.filter(
                employee=employee,
                rating_type=SkillRatingType.SELF,
            ).select_related("rated_level")
        }

        # 4. Manager-ratings keyed by skill_id
        manager_ratings = {
            r.skill_id: r
            for r in EmployeeSkillRating.objects.filter(
                employee=employee,
                rating_type=SkillRatingType.MANAGER,
            ).select_related("rated_level")
        }

        # 5. Category mapping: skill_id → first category found
        category_map = {}
        for mapping in SkillCategorySkillMap.objects.filter(
            skill_id__in=[r.skill_id for r in requirements],
            is_active=True,
        ).select_related("category"):
            if mapping.skill_id not in category_map:
                category_map[mapping.skill_id] = mapping.category

        # 6. Assemble rows
        rows = []
        for req in requirements:
            skill        = req.skill
            req_level    = req.required_level
            emp_skill    = current_skills.get(skill.id)
            self_rating  = self_ratings.get(skill.id)
            mgr_rating   = manager_ratings.get(skill.id)
            category     = category_map.get(skill.id)

            # Gap calculation
            if emp_skill and req_level:
                gap_value = req_level.level_rank - emp_skill.current_level.level_rank
                gap_value = max(gap_value, 0)  # no negative gaps
                if gap_value == 0:
                    gap_severity = "NONE"
                elif gap_value == 1:
                    gap_severity = "MINOR"
                else:
                    gap_severity = "CRITICAL"
            elif req_level:
                gap_value    = None
                gap_severity = "NOT_RATED"
            else:
                gap_value    = None
                gap_severity = None

            rows.append({
                "skill_id":       skill.id,
                "skill_name":     skill.skill_name,
                "skill_code":     skill.skill_code,
                "category_id":    category.id if category else None,
                "category_name":  category.category_name if category else None,
                "required_level": req_level,
                "current_level":  emp_skill.current_level if emp_skill else None,
                "identified_by":  emp_skill.identified_by if emp_skill else None,
                "self_rating":    self_rating,
                "manager_rating": mgr_rating,
                "gap_value":      gap_value,
                "gap_severity":   gap_severity,
            })

        return rows


