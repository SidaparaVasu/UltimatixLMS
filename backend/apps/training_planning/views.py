from rest_framework import viewsets, status
from rest_framework.decorators import action
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from apps.rbac.permission_codes import P
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
    required_permission = P.HR_MANAGEMENT.TRAINING_PLAN_MANAGE

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

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')

        # When plan is submitted for approval, auto-create a TrainingPlanApproval record
        if new_status == 'PENDING_APPROVAL' and instance.status != 'PENDING_APPROVAL':
            employee = self._get_employee(request)
            TrainingPlanApproval.objects.get_or_create(
                training_plan=instance,
                approval_status='PENDING',
                defaults={
                    'approver': employee or instance.created_by,
                    'submitted_by': employee,
                    'comments': '',
                }
            )

        updated = self.service_class().update(pk=instance.pk, **serializer.validated_data)
        return success_response(
            message="Training Plan updated successfully.",
            data=self.get_serializer(updated).data
        )


class TrainingPlanItemViewSet(BaseTPViewSet):
    queryset = TrainingPlanItem.objects.all()
    serializer_class = TrainingPlanItemSerializer
    service_class = TrainingPlanItemService
    model = TrainingPlanItem
    required_permission = P.HR_MANAGEMENT.TRAINING_PLAN_MANAGE


class TrainingPlanApprovalViewSet(BaseTPViewSet):
    queryset = TrainingPlanApproval.objects.all()
    serializer_class = TrainingPlanApprovalSerializer
    service_class = TrainingPlanApprovalService
    model = TrainingPlanApproval
    required_permission = P.LND_APPROVAL.TRAINING_PLAN_APPROVE

    def get_queryset(self):
        qs = super().get_queryset()
        training_plan = self.request.query_params.get('training_plan')
        approval_status = self.request.query_params.get('approval_status')
        if training_plan:
            qs = qs.filter(training_plan_id=training_plan)
        if approval_status:
            qs = qs.filter(approval_status=approval_status)
        return qs.order_by('-created_at')

    @action(detail=True, methods=["post"], url_path="finalize")
    def finalize(self, request, pk=None):
        status_val = request.data.get("status")
        comments = request.data.get("comments", "")

        updated_approval = self.service_class().process_approval(
            approval_id=pk,
            status=status_val,
            comments=comments
        )

        if not updated_approval:
            return error_response(message="Approval record not found.")

        return success_response(
            message="Training Plan approval status updated.",
            data=self.get_serializer(updated_approval).data
        )

    @action(detail=False, methods=["post"], url_path="finalize-by-plan")
    def finalize_by_plan(self, request):
        """Finalize the pending approval for a given plan ID."""
        plan_id   = request.data.get("plan_id")
        status_val = request.data.get("status")
        comments  = request.data.get("comments", "")

        if not plan_id:
            return error_response(message="plan_id is required.")

        approval = TrainingPlanApproval.objects.filter(
            training_plan_id=plan_id,
            approval_status='PENDING'
        ).first()

        if not approval:
            return error_response(message="No pending approval found for this plan.")

        updated_approval = self.service_class().process_approval(
            approval_id=approval.id,
            status=status_val,
            comments=comments
        )

        return success_response(
            message="Training Plan approval status updated.",
            data=self.get_serializer(updated_approval).data
        )


class TrainingCalendarViewSet(BaseTPViewSet):
    queryset = TrainingCalendar.objects.all()
    serializer_class = TrainingCalendarSerializer
    service_class = TrainingCalendarService
    model = TrainingCalendar
    required_permission = P.LND_APPROVAL.TRAINING_CALENDAR_APPROVE

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get('year')
        department = self.request.query_params.get('department')
        if year:
            qs = qs.filter(year=year)
        if department:
            qs = qs.filter(department_id=department)
        return qs.order_by('-year')

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
    required_permission = P.HR_MANAGEMENT.TRAINING_PLAN_VIEW

    def get_queryset(self):
        qs = super().get_queryset()
        calendar = self.request.query_params.get('calendar')
        session_type = self.request.query_params.get('session_type')
        start_after = self.request.query_params.get('start_date_after')
        start_before = self.request.query_params.get('start_date_before')
        year = self.request.query_params.get('year')
        department = self.request.query_params.get('department')

        if calendar:
            qs = qs.filter(calendar_id=calendar)
        if session_type:
            qs = qs.filter(session_type=session_type)
        if start_after:
            qs = qs.filter(session_start_date__gte=start_after)
        if start_before:
            qs = qs.filter(session_start_date__lte=start_before)
        # Allow filtering directly by year/department via calendar relation
        if year:
            qs = qs.filter(calendar__year=year)
        if department:
            qs = qs.filter(calendar__department_id=department)

        return qs


class TrainingSessionTrainerViewSet(BaseTPViewSet):
    queryset = TrainingSessionTrainer.objects.all()
    serializer_class = TrainingSessionTrainerSerializer
    service_class = TrainingSessionTrainerService
    model = TrainingSessionTrainer
    required_permission = P.LND_APPROVAL.TRAINING_CALENDAR_APPROVE


class TrainingSessionEnrollmentViewSet(BaseTPViewSet):
    queryset = TrainingSessionEnrollment.objects.all()
    serializer_class = TrainingSessionEnrollmentSerializer
    service_class = TrainingSessionEnrollmentService
    model = TrainingSessionEnrollment
    required_permission = P.HR_MANAGEMENT.ENROLLMENT_MANAGE

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
    required_permission = P.HR_MANAGEMENT.TRAINING_PLAN_MANAGE

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        training_session_id = request.data.get("training_session")
        records = request.data.get("records", [])

        if not training_session_id:
            return error_response(message="training_session is required.")
        if not isinstance(records, list):
            return error_response(message="records must be a list.")

        results = self.service_class().bulk_upsert(
            training_session_id=training_session_id,
            records=records,
        )
        return success_response(
            message="Attendance saved successfully.",
            data=self.get_serializer(results, many=True).data,
        )
