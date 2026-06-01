from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
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
from apps.course_management.models import CourseMaster, CourseStatus
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
        Enforces soft-lock: optional courses past end_date are blocked.
        """
        instance = self.get_object()

        # Soft-lock check
        service = UserCourseEnrollmentService()
        allowed, reason = service.can_access_course(instance)
        if not allowed:
            return error_response(
                message="This course is no longer accessible — the course period has ended.",
                status_code=403,
            )

        detailed_data = self.service_class.repository.get_enrollment_with_detailed_progress(instance.id)
        serializer = DetailedEnrollmentProgressSerializer(detailed_data)
        return success_response(data=serializer.data)

    @action(detail=False, methods=["post"])
    def enroll(self, request):
        """
        Handles self-enrollment into a course.
        Only PUBLISHED, active courses can be enrolled into.
        """
        course_id = request.data.get("course_id")
        if not course_id:
             return error_response(message="Course ID is required", status_code=400)
        
        employee = request.user.employee_record.first()
        if not employee:
             return error_response(message="Employee profile not found")

        # Guard: course must exist, be active, and be published
        try:
            course = CourseMaster.objects.get(pk=course_id)
        except CourseMaster.DoesNotExist:
            return error_response(message="Course not found.", status_code=404)

        if not course.is_active:
            return error_response(
                message="This course is currently unavailable.",
                status_code=400,
            )
        if course.status != CourseStatus.PUBLISHED:
            return error_response(
                message="Enrollment is only available for published courses.",
                status_code=400,
            )

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

        # Overdue: enrollments explicitly marked OVERDUE by the scheduler
        overdue = enrollments.filter(status=ProgressStatus.OVERDUE).count()

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

    @action(detail=True, methods=["patch"], url_path="extend-due-date")
    def extend_due_date(self, request, pk=None):
        """
        PATCH /api/v1/learning/my-learning/{id}/extend-due-date/
        Admin action: set or clear a per-learner deadline override.

        Body: { "extended_due_date": "YYYY-MM-DD" }  or  { "extended_due_date": null }
        """
        new_date_raw = request.data.get("extended_due_date")

        if new_date_raw is not None and new_date_raw != "":
            from datetime import date
            try:
                new_date = date.fromisoformat(str(new_date_raw))
            except ValueError:
                return error_response(
                    message="Invalid date format. Use YYYY-MM-DD.",
                    status_code=400,
                )
        else:
            new_date = None

        enrollment = self.get_object()
        updated = UserCourseEnrollmentService().extend_due_date(
            enrollment_id=enrollment.id,
            new_due_date=new_date,
        )
        from .serializers import UserCourseEnrollmentSerializer as _S
        return success_response(
            message="Due date updated successfully.",
            data=_S(updated).data,
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
                  playhead=serializer.data["playhead_seconds"],
                  signal_completion=serializer.data.get("signal_completion", False),
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


# ---------------------------------------------------------------------------
# SCORM Endpoints
# ---------------------------------------------------------------------------

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import UserSCORMProgress


class SCORMStateView(APIView):
    """
    GET /api/v1/learning/scorm/state/<enrollment_id>/<content_id>/

    Returns saved SCORM state for a learner + content pair.
    Called by ScormPlayer on mount, before the iframe loads, so scorm-again
    can seed its data model and the course can resume from its last position.

    First-visit response returns empty defaults — the course starts fresh.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, enrollment_id, content_id):
        employee = request.user.employee_record.first()
        if not employee:
            return error_response("Employee profile not found.", status_code=404)

        # Ownership check — learner can only read their own progress
        try:
            enrollment = UserCourseEnrollment.objects.get(
                pk=enrollment_id,
                employee=employee,
            )
        except UserCourseEnrollment.DoesNotExist:
            return error_response(
                "Enrollment not found or you do not have access to it.",
                status_code=404,
            )

        try:
            progress = UserSCORMProgress.objects.get(
                enrollment=enrollment,
                content_id=content_id,
            )
        except UserSCORMProgress.DoesNotExist:
            # First visit — return empty state; scorm-again starts a fresh session
            return success_response(data={
                'lesson_status': 'not attempted',
                'lesson_location': '',
                'suspend_data': '',
                'score_raw': None,
                'score_max': None,
                'score_min': None,
                'total_time_seconds': 0,
                'scorm_variables': {},
                'attempt_count': 1,
            })

        return success_response(data={
            'lesson_status':     progress.lesson_status,
            'lesson_location':   progress.lesson_location,
            'suspend_data':      progress.suspend_data,
            'score_raw':         str(progress.score_raw) if progress.score_raw is not None else None,
            'score_max':         str(progress.score_max) if progress.score_max is not None else None,
            'score_min':         str(progress.score_min) if progress.score_min is not None else None,
            'total_time_seconds': progress.total_time_seconds,
            'scorm_variables':   progress.scorm_variables,
            'attempt_count':     progress.attempt_count,
        })


class SCORMCommitView(APIView):
    """
    POST /api/v1/learning/scorm/commit/

    Receives a snapshot of all SCORM variables at LMSCommit / Commit time.
    Persists to UserSCORMProgress and, when the package signals completion,
    propagates it through the existing heartbeat service so the LMS sidebar,
    progress bar, and certificate logic all update automatically.

    Expected body:
    {
        "enrollment_id": 42,
        "content_id": 17,
        "lesson_id": 9,
        "scorm_data": {
            "cmi.core.lesson_status": "completed",
            "cmi.core.lesson_location": "page_7",
            "cmi.suspend_data": "...",
            "cmi.core.score.raw": "85",
            ...
        }
    }
    """
    permission_classes = [IsAuthenticated]

    # Minimum session time (seconds) before we trust a completion signal.
    # Guards against packages that fire LMSSetValue("completed") on first load.
    COMPLETION_GRACE_SECONDS = 10

    def post(self, request):
        enrollment_id = request.data.get('enrollment_id')
        content_id    = request.data.get('content_id')
        lesson_id     = request.data.get('lesson_id')
        scorm_data    = request.data.get('scorm_data', {})

        if not all([enrollment_id, content_id, lesson_id]):
            return error_response(
                "enrollment_id, content_id, and lesson_id are required.",
                status_code=400,
            )

        employee = request.user.employee_record.first()
        if not employee:
            return error_response("Employee profile not found.", status_code=404)

        # Ownership check
        try:
            enrollment = UserCourseEnrollment.objects.get(
                pk=enrollment_id,
                employee=employee,
            )
        except UserCourseEnrollment.DoesNotExist:
            return error_response(
                "Enrollment not found or you do not have access to it.",
                status_code=403,
            )

        with transaction.atomic():
            progress, _created = UserSCORMProgress.objects.get_or_create(
                enrollment=enrollment,
                content_id=content_id,
                defaults={'lesson_id': lesson_id, 'lesson_status': 'not attempted'},
            )

            # --- Map SCORM 1.2 and 2004 variable paths to model fields ---

            # Completion status
            lesson_status = (
                scorm_data.get('cmi.core.lesson_status')          # SCORM 1.2
                or scorm_data.get('cmi.completion_status')         # SCORM 2004
                or progress.lesson_status
            )

            success_status = scorm_data.get('cmi.success_status', progress.success_status)

            # Bookmark (resume location)
            lesson_location = (
                scorm_data.get('cmi.core.lesson_location')        # SCORM 1.2
                or scorm_data.get('cmi.location')                  # SCORM 2004
                or progress.lesson_location
            )

            # Resume data
            suspend_data = scorm_data.get('cmi.suspend_data', progress.suspend_data)

            # suspend_data size guard — don't let a buggy package blow up the column
            if len(suspend_data) > 65536:
                import logging as _log
                _log.getLogger(__name__).warning(
                    "SCORM commit: suspend_data truncated for enrollment=%s content=%s "
                    "(was %d chars)", enrollment_id, content_id, len(suspend_data)
                )
                suspend_data = suspend_data[:65536]

            # Score fields (SCORM 1.2 and 2004 paths)
            def _decimal(key_12, key_2004, current):
                raw = scorm_data.get(key_12) or scorm_data.get(key_2004)
                if raw is not None:
                    try:
                        return float(raw)
                    except (ValueError, TypeError):
                        pass
                return current

            score_raw    = _decimal('cmi.core.score.raw', 'cmi.score.raw',    progress.score_raw)
            score_max    = _decimal('cmi.core.score.max', 'cmi.score.max',    progress.score_max)
            score_min    = _decimal('cmi.core.score.min', 'cmi.score.min',    progress.score_min)
            score_scaled = _decimal('', 'cmi.score.scaled', progress.score_scaled)

            # Update record
            progress.lesson_status   = lesson_status
            progress.success_status  = success_status
            progress.lesson_location = lesson_location
            progress.suspend_data    = suspend_data
            progress.score_raw       = score_raw
            progress.score_max       = score_max
            progress.score_min       = score_min
            progress.score_scaled    = score_scaled
            progress.scorm_variables = scorm_data    # full snapshot for audit
            progress.save()

            # --- Propagate completion to LMS progress pipeline ---
            # Only trigger if SCORM declares the SCO complete/passed.
            # The heartbeat service handles all downstream effects:
            # lesson completion, course progress %, certificate eligibility.
            if progress.is_complete():
                try:
                    svc = UserContentProgressService()
                    svc.record_heartbeat(
                        enrollment_id=enrollment.id,
                        lesson_id=lesson_id,
                        content_id=content_id,
                        playhead=1,                 # SCORM has no video playhead concept
                        signal_completion=True,
                    )
                except Exception as exc:
                    import logging as _log
                    _log.getLogger(__name__).error(
                        "Failed to propagate SCORM completion to lesson progress: %s", exc
                    )
                    # Don't fail the whole commit — SCORM state is already saved

        return success_response(
            message="SCORM state committed.",
            data={'lesson_status': progress.lesson_status},
        )
