from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from .models import (
    LearningPathMaster,
    UserCourseEnrollment,
    UserLessonProgress,
    CourseCertificate
)
from .serializers import (
    LearningPathSerializer,
    UserCourseEnrollmentSerializer,
    DetailedEnrollmentProgressSerializer,
    HeartbeatSyncSerializer,
    CourseCertificateSerializer
)
from .services import (
    LearningPathService,
    UserCourseEnrollmentService,
    UserContentProgressService,
    CourseCertificateService
)
from .constants import ProgressStatus
from common.response import success_response, error_response


class UserProgressViewSet(viewsets.ModelViewSet):
    """
    Primary endpoint for the Student Learning Journey.
    """
    queryset = UserCourseEnrollment.objects.all()
    serializer_class = UserCourseEnrollmentSerializer
    service_class = UserCourseEnrollmentService()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "enrollment_type"]
    ordering_fields = ["enrolled_at", "progress_percentage"]

    def get_queryset(self):
        """
        Students only see their own enrollments.
        Instructors/Admins see all records.
        """
        # Note: RBAC filters should ideally be in a mixin or base class
        # Accessing self.request.user.employee.id for strict student isolation
        # TODO: move into a global StudentIsolationMixin
        if hasattr(self.request.user, 'employee_record'):
             employee = self.request.user.employee_record.first()
             if employee:
                  return self.queryset.filter(employee=employee)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        """
        Provides detailed hierarchical progress for the course player.
        """
        instance = self.get_object()
        # Use deep fetch utility from service/repository if possible
        detailed_data = self.service_class.repository.get_enrollment_with_detailed_progress(instance.id)
        serializer = DetailedEnrollmentProgressSerializer(detailed_data)
        return success_response(data=serializer.data)

    @action(detail=False, methods=["post"])
    def enroll(self, request):
        """
        Handles self-enrollment into a course.
        """
        course_id = request.data.get("course_id")
        if not course_id:
             return error_response(message="Course ID is required", status_code=400)
        
        employee = request.user.employee_record.first()
        if not employee:
             return error_response(message="Employee profile not found")

        # Check for existing enrollment
        existing = UserCourseEnrollment.objects.filter(
             employee=employee, 
             course_id=course_id
        ).first()
        
        if existing:
             return error_response(message="Already enrolled in this course")

        enrollment = self.service_class.enroll_employee_in_course(
             employee_id=employee.id,
             course_id=course_id
        )
        serializer = self.get_serializer(enrollment)
        return success_response(data=serializer.data, status_code=201)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """
        GET /api/v1/learning/my-learning/summary/

        Returns enrollment counts and certificate count for the current employee.
        Used by the employee dashboard.
        """
        employee = None
        if hasattr(request.user, 'employee_record'):
            employee = request.user.employee_record.first()

        if not employee:
            return error_response(
                message="Employee profile not found for this user.",
                status_code=status.HTTP_404_NOT_FOUND
            )

        enrollments = UserCourseEnrollment.objects.filter(employee=employee)

        in_progress = enrollments.filter(status=ProgressStatus.IN_PROGRESS).count()
        completed = enrollments.filter(status=ProgressStatus.COMPLETED).count()
        not_started = enrollments.filter(status=ProgressStatus.NOT_STARTED).count()

        # Overdue: mandatory/TNI courses not completed within 30 days of enrollment
        overdue_threshold = timezone.now() - timedelta(days=30)
        overdue = enrollments.filter(
            status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
            enrollment_type__in=["MANDATORY", "TNI_ASSIGNED"],
            enrolled_at__lt=overdue_threshold
        ).count()

        certificates_earned = CourseCertificate.objects.filter(
            enrollment__employee=employee
        ).count()

        return success_response(
            message="Enrollment summary retrieved successfully.",
            data={
                "in_progress": in_progress,
                "completed": completed,
                "not_started": not_started,
                "overdue": overdue,
                "certificates_earned": certificates_earned,
            }
        )


class HeartbeatViewSet(viewsets.ViewSet):
    """
    Endpoint for real-time progress syncing (Patch heartbeats).
    """
    service_class = UserContentProgressService()

    @action(detail=False, methods=["post"])
    def sync(self, request):
        """
        POST heartbeat from course player.
        """
        serializer = HeartbeatSyncSerializer(data=request.data)
        if serializer.is_valid():
             # Security Check: Ensure the enrollment belongs to the request user
             enrollment_id = serializer.data["enrollment_id"]
             # If student, check if they own this enrollment
             if hasattr(request.user, 'employee_record'):
                  employee = request.user.employee_record.first()
                  is_owner = UserCourseEnrollment.objects.filter(
                       id=enrollment_id, 
                       employee=employee
                  ).exists()
                  if not is_owner:
                       return error_response(
                            message="You do not have permission to update this enrollment", 
                            status_code=403
                       )

             heartbeat = self.service_class.record_heartbeat(
                  enrollment_id=enrollment_id,
                  lesson_id=serializer.data["lesson_id"],
                  content_id=serializer.data["content_id"],
                  playhead=serializer.data["playhead_seconds"]
             )
             return success_response(message="Heartbeat recorded", data={"playhead": heartbeat.playhead_seconds})
        return error_response(message="Invalid heartbeat data", errors=serializer.errors)


class LearningPathViewSet(viewsets.ModelViewSet):
    queryset = LearningPathMaster.objects.filter(is_active=True)
    serializer_class = LearningPathSerializer
    service_class = LearningPathService()


class CourseCertificateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseCertificate.objects.all()
    serializer_class = CourseCertificateSerializer
    service_class = CourseCertificateService()
    
    def get_queryset(self):
         if hasattr(self.request.user, 'employee'):
              return self.queryset.filter(enrollment__employee=self.request.user.employee)
         return self.queryset
