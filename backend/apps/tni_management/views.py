from rest_framework import viewsets, status
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from .models import (
    TrainingNeed,
    SkillGapSnapshot,
    ComplianceTrainingRequirement,
    TrainingNeedApproval,
    TrainingNeedCourseRecommendation,
    TNIAggregatedAnalysis
)
from .serializers import (
    TrainingNeedSerializer,
    SkillGapSnapshotSerializer,
    ComplianceRequirementSerializer,
    TrainingNeedApprovalSerializer,
    CourseRecommendationSerializer,
    TNIAggregatedAnalysisSerializer,
    GapAnalysisTriggerSerializer
)
from .services import (
    TrainingNeedService,
    SkillGapSnapshotService,
    ComplianceRequirementService,
    TNIApprovalService,
    TNICourseRecommendationService,
    TNIAnalysisService,
    TNIEngineService
)


class BaseTNIViewSet(viewsets.ModelViewSet):
    """
    Standardizes CRUD response logic for the TNI Management module.
    Inherits from the repository-service pattern architecture.
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
        updated = self.service_class().update(pk=instance.pk, **serializer.validated_data)
        return success_response(
            message=f"{self.model._meta.verbose_name} updated successfully.",
            data=self.get_serializer(updated).data
        )

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        soft_delete = request.query_params.get("soft_delete", "true").lower() == "true"
        self.service_class().delete(pk=pk, soft_delete=soft_delete)
        msg = f"{self.model._meta.verbose_name} deleted successfully."
        return success_response(message=msg)


class TrainingNeedViewSet(BaseTNIViewSet):
    queryset = TrainingNeed.objects.all()
    serializer_class = TrainingNeedSerializer
    service_class = TrainingNeedService
    model = TrainingNeed
    required_permission = "TNI_MANAGE"

    @extend_schema(responses={200: TrainingNeedSerializer(many=True)})
    @action(detail=False, methods=["post"], url_path="run-gap-analysis")
    def run_gap_analysis(self, request):
        """
        Action to trigger the automated skill gap identification engine.
        """
        serializer = GapAnalysisTriggerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        employee_id = serializer.validated_data.get("employee_id")
        if not employee_id:
            # Detect for current user's profile if none provided
            from apps.org_management.models import EmployeeMaster
            employee = EmployeeMaster.objects.filter(user=request.user).first()
            if employee:
                employee_id = employee.id

        if not employee_id:
            return error_response(message="Employee profile not found.")

        result = TNIEngineService().analyze_employee_gaps(employee_id)
        return success_response(
            message="Gap analysis completed successfully.",
            data=TrainingNeedSerializer(result, many=True).data
        )


class SkillGapSnapshotViewSet(BaseTNIViewSet):
    queryset = SkillGapSnapshot.objects.all()
    serializer_class = SkillGapSnapshotSerializer
    service_class = SkillGapSnapshotService
    model = SkillGapSnapshot
    required_permission = "TNI_VIEW"
    http_method_names = ["get", "delete"] # Read-only (for most users)


class ComplianceRequirementViewSet(BaseTNIViewSet):
    queryset = ComplianceTrainingRequirement.objects.all()
    serializer_class = ComplianceRequirementSerializer
    service_class = ComplianceRequirementService
    model = ComplianceTrainingRequirement
    required_permission = "COMPLIANCE_MANAGE"


class TrainingNeedApprovalViewSet(BaseTNIViewSet):
    queryset = TrainingNeedApproval.objects.all()
    serializer_class = TrainingNeedApprovalSerializer
    service_class = TNIApprovalService
    model = TrainingNeedApproval
    required_permission = "TNI_APPROVE"

    @action(detail=True, methods=["post"], url_path="finalize")
    def finalize(self, request, pk=None):
        """Finalize the approval process for a specific TNI entry."""
        status = request.data.get("status")
        comments = request.data.get("comments", "")
        
        # Determine approver from current employee profile
        from apps.org_management.models import EmployeeMaster
        approver = EmployeeMaster.objects.filter(user=request.user).first()
        if not approver:
            return error_response(message="Approver profile not found.")

        updated_approval = self.service_class().process_approval(
            approval_id=pk, 
            status=status, 
            comments=comments, 
            approver_id=approver.id
        )
        return success_response(
            message="TNI approval status updated.",
            data=self.get_serializer(updated_approval).data
        )


class CourseRecommendationViewSet(BaseTNIViewSet):
    queryset = TrainingNeedCourseRecommendation.objects.all()
    serializer_class = CourseRecommendationSerializer
    service_class = TNICourseRecommendationService
    model = TrainingNeedCourseRecommendation
    required_permission = "TNI_MANAGE"


class TNIAnalysisViewSet(BaseTNIViewSet):
    queryset = TNIAggregatedAnalysis.objects.all()
    serializer_class = TNIAggregatedAnalysisSerializer
    service_class = TNIAnalysisService
    model = TNIAggregatedAnalysis
    required_permission = "REPORTS_VIEW"
    http_method_names = ["get"] # Dashboard analytics (read-only)
