from rest_framework import viewsets, status
from rest_framework.decorators import action
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from .models import (
    TrainingPlan,
    TrainingPlanItem,
    TrainingPlanApproval,
    TrainingCalendar,
    TrainingSession,
    TrainingSessionTrainer,
    TrainingSessionEnrollment,
    TrainingAttendance
)
from .serializers import (
    TrainingPlanSerializer,
    TrainingPlanItemSerializer,
    TrainingPlanApprovalSerializer,
    TrainingCalendarSerializer,
    TrainingSessionSerializer,
    TrainingSessionTrainerSerializer,
    TrainingSessionEnrollmentSerializer,
    TrainingAttendanceSerializer
)
from .services import (
    TrainingPlanService,
    TrainingPlanItemService,
    TrainingPlanApprovalService,
    TrainingCalendarService,
    TrainingSessionService,
    TrainingSessionTrainerService,
    TrainingSessionEnrollmentService,
    TrainingAttendanceService
)


class BaseTPViewSet(viewsets.ModelViewSet):
    """
    Standard ViewSet for Training Planning module integrating Repository-Service pattern.
    """
    service_class = None
    model = None
    permission_classes = [HasScopedPermission]

    def _get_employee(self, request):
        from apps.org_management.models import EmployeeMaster
        return EmployeeMaster.objects.filter(user=request.user).first()

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
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
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


class TrainingPlanViewSet(BaseTPViewSet):
    queryset = TrainingPlan.objects.all()
    serializer_class = TrainingPlanSerializer
    service_class = TrainingPlanService
    model = TrainingPlan
    required_permission = "PLAN_MANAGE"

    def create(self, request, *args, **kwargs):
        employee = self._get_employee(request)
        if not employee:
            return error_response(
                message="Employee profile not found for this user.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(
            created_by=employee,
            **serializer.validated_data
        )
        return created_response(
            message="Training Plan created successfully.",
            data=self.get_serializer(instance).data
        )


class TrainingPlanItemViewSet(BaseTPViewSet):
    queryset = TrainingPlanItem.objects.all()
    serializer_class = TrainingPlanItemSerializer
    service_class = TrainingPlanItemService
    model = TrainingPlanItem
    required_permission = "PLAN_MANAGE"


class TrainingPlanApprovalViewSet(BaseTPViewSet):
    queryset = TrainingPlanApproval.objects.all()
    serializer_class = TrainingPlanApprovalSerializer
    service_class = TrainingPlanApprovalService
    model = TrainingPlanApproval
    required_permission = "PLAN_APPROVE"

    @action(detail=True, methods=["post"], url_path="finalize")
    def finalize(self, request, pk=None):
        """Finalize the strategy approval process for a specific planning window."""
        status_val = request.data.get("status")
        comments = request.data.get("comments", "")
        
        updated_approval = self.service_class().process_approval(
            approval_id=pk, 
            status=status_val, 
            comments=comments
        )
        return success_response(
            message="Training Plan strategy status updated.",
            data=self.get_serializer(updated_approval).data
        )


class TrainingCalendarViewSet(BaseTPViewSet):
    queryset = TrainingCalendar.objects.all()
    serializer_class = TrainingCalendarSerializer
    service_class = TrainingCalendarService
    model = TrainingCalendar
    required_permission = "SESSION_SCHEDULE"

    def create(self, request, *args, **kwargs):
        employee = self._get_employee(request)
        if not employee:
            return error_response(
                message="Employee profile not found for this user.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(
            created_by=employee,
            **serializer.validated_data
        )
        return created_response(
            message="Training Calendar created successfully.",
            data=self.get_serializer(instance).data
        )


class TrainingSessionViewSet(BaseTPViewSet):
    queryset = TrainingSession.objects.all()
    serializer_class = TrainingSessionSerializer
    service_class = TrainingSessionService
    model = TrainingSession
    required_permission = "SESSION_VIEW"


class TrainingSessionTrainerViewSet(BaseTPViewSet):
    queryset = TrainingSessionTrainer.objects.all()
    serializer_class = TrainingSessionTrainerSerializer
    service_class = TrainingSessionTrainerService
    model = TrainingSessionTrainer
    required_permission = "SESSION_SCHEDULE"


class TrainingSessionEnrollmentViewSet(BaseTPViewSet):
    queryset = TrainingSessionEnrollment.objects.all()
    serializer_class = TrainingSessionEnrollmentSerializer
    service_class = TrainingSessionEnrollmentService
    model = TrainingSessionEnrollment
    required_permission = "SESSION_ENROLL"

    @action(detail=False, methods=["post"], url_path="sign-up")
    def sign_up(self, request):
        """Action for employee self-enrollment with automatic waitlist handling."""
        session_id = request.data.get("session_id")
        
        # Identify current employee from profile
        from apps.org_management.models import EmployeeMaster
        employee = EmployeeMaster.objects.filter(user=request.user).first()
        if not employee:
            return error_response(message="Employee profile not found.")

        enrollment = self.service_class().enroll_employee(
            session_id=session_id, 
            employee_id=employee.id
        )
        return success_response(
            message="Enrollment successful (Capacity checked).",
            data=self.get_serializer(enrollment).data
        )


class TrainingAttendanceViewSet(BaseTPViewSet):
    queryset = TrainingAttendance.objects.all()
    serializer_class = TrainingAttendanceSerializer
    service_class = TrainingAttendanceService
    model = TrainingAttendance
    required_permission = "SESSION_MANAGE"
