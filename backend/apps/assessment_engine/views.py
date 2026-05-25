from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from common.response import success_response, error_response, created_response
from apps.rbac.permissions import HasScopedPermission
from apps.rbac.permission_codes import P
from .models import (
    AssessmentMaster, QuestionBank, AssessmentAttempt, AssessmentResult,
    AssessmentSkillMapping, SkillUpgradeProposal,
)
from .serializers import (
    AssessmentMasterStudioSerializer, AssessmentLearnerSerializer,
    QuestionBankStudioSerializer, QuestionBankWriteSerializer,
    QuestionBankWithSkillSerializer,
    AssessmentAttemptSerializer, UserAnswerSubmitSerializer,
    AssessmentResultSerializer, QuestionLearnerSerializer,
    UserAnswerLifecycleSerializer,
    ReviewAttemptListSerializer, ReviewAttemptDetailSerializer,
    ManualGradeSubmitSerializer, RetakeGrantSerializer,
    AssessmentSkillMappingSerializer, AssessmentQuestionMappingSerializer,
    AssessmentCatalogSerializer,
    SkillUpgradeProposalSerializer,
)
from .services import AssessmentBuildService, AttemptService, GradingService, ReviewService


class AssessmentStudioViewSet(viewsets.ModelViewSet):
    """
    Studio API for instructors to manage assessments.
    Uses the standard success/error response envelope so the frontend
    handleApiResponse helper can parse results correctly.
    """
    queryset = AssessmentMaster.objects.all()
    serializer_class = AssessmentMasterStudioSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.CONTENT_MANAGEMENT.ASSESSMENT_MANAGE

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson_id')
        course_id = self.request.query_params.get('course_id')
        standalone = self.request.query_params.get('standalone')  # ?standalone=true → no course
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if course_id:
            qs = qs.filter(course_id=course_id)
        if standalone and standalone.lower() == 'true':
            qs = qs.filter(course__isnull=True)
        return qs.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
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
        instance = serializer.save()
        return created_response(
            message="Assessment created successfully.",
            data=self.get_serializer(instance).data,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return success_response(
            message="Assessment updated successfully.",
            data=self.get_serializer(instance).data,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(message="Assessment deleted successfully.")

    @action(detail=True, methods=['post'], url_path='sync-questions')
    def sync_questions(self, request, pk=None):
        """
        Bulk links questions to the assessment.
        Expects: { questions: [ { question_id: uuid, weight: 1.0 }, ... ] }
        """
        service = AssessmentBuildService()
        data = request.data.get('questions', [])
        try:
            service.bulk_sync_questions(pk, data)
            return success_response(message="Assessment questions synced successfully.")
        except Exception as e:
            return error_response(message=str(e))

    @action(detail=True, methods=['post'], url_path='suggest-questions')
    def suggest_questions(self, request, pk=None):
        """
        POST /assessment/studio/:id/suggest-questions/

        Runs the DynamicQuestionSelector against the assessment's skill mappings
        and returns a suggested question list WITHOUT saving anything.

        Requires:
          - assessment.question_selection_mode in (DYNAMIC, CURATED)
          - at least one AssessmentSkillMapping on the assessment

        Returns the same shape as QuestionBankWithSkillSerializer so the
        frontend can render the suggestions in the question picker.
        """
        from .constants import QuestionSelectionMode
        from .question_selector import DynamicQuestionSelector, InsufficientQuestionsError

        assessment = self.get_object()

        if assessment.question_selection_mode == QuestionSelectionMode.FIXED:
            return error_response(
                message="Auto-suggestion is not available for FIXED (course quiz) assessments."
            )

        skill_mappings = AssessmentSkillMapping.objects.filter(assessment=assessment)
        if not skill_mappings.exists():
            return error_response(
                message="Add at least one skill mapping before using auto-suggestion."
            )

        employee = getattr(request.user, 'employee_record', None)
        employee = employee.first() if employee else None
        employee_id = employee.id if employee else 0

        selector = DynamicQuestionSelector()
        try:
            questions = selector.select(
                assessment=assessment,
                employee_id=employee_id,
                number_of_questions=assessment.number_of_questions,
            )
        except InsufficientQuestionsError as e:
            return error_response(
                message=str(e),
                errors=e.breakdown,
                status_code=422,
            )

        from .serializers import QuestionBankWithSkillSerializer
        serializer = QuestionBankWithSkillSerializer(questions, many=True)
        return success_response(
            message=f"{len(questions)} question(s) suggested based on skill mappings.",
            data=serializer.data,
        )

    @action(detail=True, methods=['get'], url_path='check-availability')
    def check_availability(self, request, pk=None):
        """
        GET /assessment/studio/:id/check-availability/

        Checks whether the question bank has enough questions to satisfy
        this assessment's number_of_questions requirement given its skill mappings.

        Returns:
          {
            available: int,       — total eligible questions across all skill mappings
            required:  int,       — assessment.number_of_questions
            sufficient: bool,     — available >= required
            breakdown: [          — per-skill detail
              { skill: str, target_level_rank: int, available: int }
            ]
          }

        Used by the assessment form to show a real-time availability indicator.
        """
        from .constants import QuestionSelectionMode
        from .models import QuestionBank

        assessment = self.get_object()

        if assessment.question_selection_mode == QuestionSelectionMode.FIXED:
            return error_response(
                message="Availability check is not applicable for FIXED assessments."
            )

        skill_mappings = AssessmentSkillMapping.objects.filter(
            assessment=assessment
        ).select_related('skill', 'skill_level')

        if not skill_mappings.exists():
            return success_response(data={
                "available":  0,
                "required":   assessment.number_of_questions,
                "sufficient": False,
                "breakdown":  [],
                "message":    "No skill mappings defined. Add skill mappings to check availability.",
            })

        breakdown = []
        total_available = 0

        for sm in skill_mappings:
            count = QuestionBank.objects.filter(
                skill=sm.skill,
                skill_level__level_rank__gte=sm.skill_level.level_rank,
                is_active=True,
                question_type__in=["MCQ", "MSQ", "TRUE_FALSE", "DESCRIPTIVE", "SCENARIO"],
            ).count()
            breakdown.append({
                "skill":              sm.skill.skill_name,
                "target_level_rank":  sm.skill_level.level_rank,
                "target_level_name":  sm.skill_level.level_name,
                "available":          count,
            })
            total_available += count

        required = assessment.number_of_questions
        return success_response(data={
            "available":  total_available,
            "required":   required,
            "sufficient": total_available >= required,
            "breakdown":  breakdown,
        })

    @action(detail=False, methods=['post'], url_path='check-availability-preview')
    def check_availability_preview(self, request):
        """
        POST /assessment/studio/check-availability-preview/

        Checks question availability WITHOUT a saved assessment.
        Used by the create form to show real-time availability as skill mappings
        are added, before the assessment is saved.

        Payload:
          {
            "skill_mappings": [
              { "skill": <int>, "skill_level": <int> }
            ],
            "number_of_questions": <int>
          }

        Returns the same shape as check-availability/:id/ so the frontend
        can use the same component for both create and edit.
        """
        from apps.skill_management.models import SkillMaster, SkillLevelMaster

        skill_mappings_data = request.data.get('skill_mappings', [])
        number_of_questions = request.data.get('number_of_questions', 0)

        if not skill_mappings_data:
            return success_response(data={
                "available":  0,
                "required":   number_of_questions,
                "sufficient": False,
                "breakdown":  [],
                "message":    "No skill mappings provided.",
            })

        breakdown = []
        total_available = 0

        for sm_data in skill_mappings_data:
            skill_id       = sm_data.get('skill')
            skill_level_id = sm_data.get('skill_level')

            if not skill_id or not skill_level_id:
                continue

            try:
                skill       = SkillMaster.objects.get(id=skill_id)
                skill_level = SkillLevelMaster.objects.get(id=skill_level_id)
            except (SkillMaster.DoesNotExist, SkillLevelMaster.DoesNotExist):
                continue

            count = QuestionBank.objects.filter(
                skill=skill,
                skill_level__level_rank__gte=skill_level.level_rank,
                is_active=True,
                question_type__in=["MCQ", "MSQ", "TRUE_FALSE", "DESCRIPTIVE", "SCENARIO"],
            ).count()

            breakdown.append({
                "skill":             skill.skill_name,
                "target_level_rank": skill_level.level_rank,
                "target_level_name": skill_level.level_name,
                "available":         count,
            })
            total_available += count

        return success_response(data={
            "available":  total_available,
            "required":   number_of_questions,
            "sufficient": total_available >= number_of_questions,
            "breakdown":  breakdown,
        })


class QuestionBankViewSet(viewsets.ModelViewSet):
    """
    API for managing the central question pool.
    Supports filtering by skill, skill_level, and question_type.
    """
    queryset = QuestionBank.objects.select_related('skill', 'skill_level').all()
    serializer_class = QuestionBankWithSkillSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.CONTENT_MANAGEMENT.ASSESSMENT_MANAGE

    def get_queryset(self):
        qs = super().get_queryset()

        # ── Org filter: show only questions created by the requesting user's company ──
        employee = getattr(self.request.user, 'employee_record', None)
        employee = employee.first() if employee else None
        if employee and getattr(employee, 'company', None):
            qs = qs.filter(created_by__company=employee.company)

        skill_id     = self.request.query_params.get('skill')
        level_id     = self.request.query_params.get('skill_level')
        q_type       = self.request.query_params.get('question_type')
        is_active    = self.request.query_params.get('is_active')
        search       = self.request.query_params.get('search')
        # ?exclude_assessment=<id> — exclude questions already mapped to this assessment
        exclude_assessment = self.request.query_params.get('exclude_assessment')

        if skill_id:
            qs = qs.filter(skill_id=skill_id)
        if level_id:
            qs = qs.filter(skill_level_id=level_id)
        if q_type:
            qs = qs.filter(question_type=q_type)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() not in ('false', '0'))
        if search:
            qs = qs.filter(question_text__icontains=search)
        if exclude_assessment:
            from .models import AssessmentQuestionMapping
            already_mapped = AssessmentQuestionMapping.objects.filter(
                assessment_id=exclude_assessment,
                attempt__isnull=True,
            ).values_list('question_id', flat=True)
            qs = qs.exclude(id__in=already_mapped)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return QuestionBankWriteSerializer
        return QuestionBankWithSkillSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Set created_by to the requesting user's employee record
        employee = getattr(request.user, 'employee_record', None)
        employee = employee.first() if employee else None
        instance = serializer.save(created_by=employee)
        return created_response(
            message="Question created successfully.",
            data=QuestionBankWithSkillSerializer(instance).data,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return success_response(
            message="Question updated successfully.",
            data=QuestionBankWithSkillSerializer(instance).data,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(data=self.get_serializer(instance).data)

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        """
        POST /assessment/questions/bulk-upload/
        Accepts a CSV or Excel file. Validates ALL rows first.
        Imports nothing if any row has an error — returns full error report.

        CSV columns:
          question_type, question_text, scenario_text, explanation_text,
          difficulty_complexity, skill_code, skill_level_name,
          option_1, option_1_correct, option_2, option_2_correct,
          option_3, option_3_correct, option_4, option_4_correct
        """
        from .bulk_upload import QuestionBulkUploader
        file = request.FILES.get('file')
        if not file:
            return error_response(message="No file provided. Upload a CSV or Excel file.")

        uploader = QuestionBulkUploader()
        result = uploader.process(file)

        if result['errors']:
            return error_response(
                message=f"Validation failed. {len(result['errors'])} error(s) found. No questions were imported.",
                errors=result['errors'],
                status_code=400,
            )

        return created_response(
            message=f"{result['imported']} question(s) imported successfully.",
            data={"imported": result['imported']},
        )

    @action(detail=False, methods=['get'], url_path='bulk-upload-template')
    def bulk_upload_template(self, request):
        """
        GET /assessment/questions/bulk-upload-template/
        Returns a sample CSV file showing the expected format.
        """
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="question_bank_template.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'question_type', 'question_text', 'scenario_text', 'explanation_text',
            'difficulty_complexity', 'skill_code', 'skill_level_name',
            'option_1', 'option_1_correct',
            'option_2', 'option_2_correct',
            'option_3', 'option_3_correct',
            'option_4', 'option_4_correct',
        ])
        # Sample rows
        writer.writerow([
            'MCQ', 'What is a Python list?', '', 'A list is a mutable sequence.',
            '2', 'PYTHON', 'Basic',
            'A mutable ordered sequence', 'TRUE',
            'An immutable tuple', 'FALSE',
            'A dictionary', 'FALSE',
            'A set', 'FALSE',
        ])
        writer.writerow([
            'TRUE_FALSE', 'Python is a compiled language.', '', 'Python is interpreted.',
            '1', 'PYTHON', 'Basic',
            'True', 'FALSE',
            'False', 'TRUE',
            '', '',
            '', '',
        ])
        writer.writerow([
            'DESCRIPTIVE', 'Explain the difference between a list and a tuple in Python.',
            '', 'Lists are mutable; tuples are immutable.',
            '3', 'PYTHON', 'Intermediate',
            '', '', '', '', '', '', '', '',
        ])
        return response


class AssessmentAttemptViewSet(viewsets.ModelViewSet):
    """
    Learner API for taking exams.
    """
    queryset = AssessmentAttempt.objects.all()
    serializer_class = AssessmentAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Students only see their own attempts
        return self.queryset.filter(employee__user=self.request.user)

    @action(detail=False, methods=['post'], url_path='start')
    def start_attempt(self, request):
        """
        Starts a new exam session.
        Payload: { assessment_id: int }
        """
        assessment_id = request.data.get('assessment_id')
        employee = request.user.employee_record.first()
        
        service = AttemptService()
        try:
            attempt = service.start_attempt(employee.id, assessment_id)
            serializer = self.get_serializer(attempt)
            return created_response(
                message="Attempt initialized successfully.",
                data=serializer.data
            )
        except ValueError as e:
            return error_response(message=str(e))

    @action(detail=True, methods=['get'], url_path='next-question')
    def get_next_question(self, request, pk=None):
        """
        Retrieves the next available question for the linear flow.
        Starts the question-specific timer.
        """
        service = AttemptService()
        try:
            answer = service.get_next_question(pk)
            if not answer:
                return success_response(
                    message="No more questions in this assessment.",
                    data={"completed": True}
                )
            serializer = UserAnswerLifecycleSerializer(answer)
            return success_response(data=serializer.data)
        except Exception as e:
            return error_response(message=str(e))

    @action(detail=True, methods=['post'], url_path='submit-question')
    def submit_question(self, request, pk=None):
        """
        Submits answer for a single question with hard-timing check.
        """
        question_id = request.data.get('question_id')
        selected_option_ids = request.data.get('selected_options', [])
        answer_text = request.data.get('answer_text', "")
        
        service = AttemptService()
        try:
            answer, on_time = service.submit_question_answer(
                pk, question_id, 
                selected_option_ids=selected_option_ids,
                answer_text=answer_text
            )
            
            return success_response(
                message="Answer recorded." if on_time else "Time limit exceeded. Answer not recorded.",
                data={"on_time": on_time, "status": answer.status}
            )
        except Exception as e:
            return error_response(message=str(e))

    @action(detail=True, methods=['post'], url_path='finalize')
    def finalize_attempt(self, request, pk=None):
        """
        Explicitly triggers the grading engine once all questions are done.
        """
        attempt = self.get_object()
        if attempt.status == "COMPLETED":
            return error_response(message="Attempt already finalized.")

        grader = GradingService()
        try:
            result = grader.grade_attempt(attempt.id)
            return success_response(
                message="Assessment finalized and submitted for grading.",
                data={"status": "COMPLETED"}
            )
        except Exception as e:
            return error_response(message=f"Deployment failed: {str(e)}")

    @action(detail=True, methods=['get'], url_path='result')
    def get_result(self, request, pk=None):
        """
        Delayed result API. Only accessible after completion.
        """
        attempt = self.get_object()
        if attempt.status != "COMPLETED":
            return error_response(message="Result not available until assessment is completed.")
        
        try:
            result = attempt.result
            serializer = AssessmentResultSerializer(result)
            return success_response(data=serializer.data)
        except Exception:
            return error_response(message="Result record not found.")

    @action(detail=True, methods=['get'], url_path='resume')
    def resume_attempt(self, request, pk=None):
        """
        Resume an in-progress attempt after a disconnect or tab close.

        Returns:
          - finalized: true  → attempt was expired or already completed; grading triggered
          - finalized: false → attempt is still active; returns remaining_seconds + next question

        GET /assessment/attempts/:id/resume/
        """
        attempt = self.get_object()

        # ── Already completed ─────────────────────────────────────────────────
        if attempt.status == "COMPLETED":
            return success_response(data={
                "attempt_id": str(attempt.id),
                "status": "COMPLETED",
                "remaining_seconds": 0,
                "next_question": None,
                "finalized": True,
            })

        # ── Check expiry — auto-finalize if time has run out ──────────────────
        now = timezone.now()
        if attempt.expires_at <= now:
            # Mark all NOT_VISITED answers as TIMED_OUT
            from .models import UserAnswer
            UserAnswer.objects.filter(
                attempt=attempt,
                status="NOT_VISITED",
            ).update(status="TIMED_OUT", finished_at=now)

            grader = GradingService()
            try:
                grader.grade_attempt(attempt.id)
            except Exception:
                pass  # grading failure must not block the response

            return success_response(data={
                "attempt_id": str(attempt.id),
                "status": "COMPLETED",
                "remaining_seconds": 0,
                "next_question": None,
                "finalized": True,
            })

        # ── Still active — return remaining time and next question ────────────
        remaining_seconds = max(0, int((attempt.expires_at - now).total_seconds()))

        service = AttemptService()
        next_answer = service.get_next_question(attempt.id)

        if not next_answer:
            # All questions answered — trigger finalize
            grader = GradingService()
            try:
                grader.grade_attempt(attempt.id)
            except Exception:
                pass
            return success_response(data={
                "attempt_id": str(attempt.id),
                "status": "COMPLETED",
                "remaining_seconds": 0,
                "next_question": None,
                "finalized": True,
            })

        serializer = UserAnswerLifecycleSerializer(next_answer)
        return success_response(data={
            "attempt_id": str(attempt.id),
            "status": "IN_PROGRESS",
            "remaining_seconds": remaining_seconds,
            "next_question": serializer.data,
            "finalized": False,
        })


class AssessmentLearnerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Safe read-only endpoint for learners to fetch assessment metadata.

    GET /api/v1/assessment/learner/                    → all published assessments
    GET /api/v1/assessment/learner/?lesson_id=<id>     → assessments for a lesson
    GET /api/v1/assessment/learner/?course_id=<id>     → assessments for a course
    GET /api/v1/assessment/learner/?standalone=true    → assessments with no course
    """
    queryset = AssessmentMaster.objects.filter(status__in=['PUBLISHED', 'DRAFT'])
    serializer_class = AssessmentLearnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson_id')
        course_id = self.request.query_params.get('course_id')
        standalone = self.request.query_params.get('standalone')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        if course_id:
            qs = qs.filter(course_id=course_id)
        if standalone and standalone.lower() == 'true':
            qs = qs.filter(course__isnull=True)
        return qs.order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)


class AssessmentReviewViewSet(viewsets.ViewSet):
    """
    Instructor / Admin API for manually reviewing and grading assessment attempts.

    Endpoints:
      GET    /assessment/review/                      — list attempts pending manual review
      GET    /assessment/review/:attemptId/           — full attempt detail for grading
      POST   /assessment/review/:attemptId/submit/    — submit manual grades + finalize result
      POST   /assessment/review/:attemptId/grant-retake/ — grant one extra attempt to the learner
    """
    permission_classes = [HasScopedPermission]
    required_permission = P.CONTENT_MANAGEMENT.ASSESSMENT_REVIEW_MANAGE

    def _get_reviewer_employee(self, request):
        employee = getattr(request.user, 'employee_record', None)
        return employee.first() if employee else None

    # ── GET /review/ ─────────────────────────────────────────────────────────
    def list(self, request):
        """
        Returns all COMPLETED attempts whose result is still PENDING manual review.
        Optional filters: ?assessment=<id>  ?course=<id>
        """
        from django.db.models import Sum
        from .models import AssessmentResult

        qs = AssessmentAttempt.objects.filter(
            status="COMPLETED",
            result__grading_type="PENDING",
        ).select_related(
            "employee__user__profile",
            "assessment__course",
            "result",
        ).order_by("result__graded_at", "-submitted_at")

        assessment_id = request.query_params.get("assessment")
        course_id = request.query_params.get("course")
        standalone = request.query_params.get("standalone")
        if assessment_id:
            qs = qs.filter(assessment_id=assessment_id)
        if course_id:
            qs = qs.filter(assessment__course_id=course_id)
        if standalone == "true":
            qs = qs.filter(assessment__course__isnull=True)
        elif standalone == "false":
            qs = qs.filter(assessment__course__isnull=False)

        from common.pagination import StandardResultsPagination
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = ReviewAttemptListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ReviewAttemptListSerializer(qs, many=True)
        return success_response(data=serializer.data)

    # ── GET /review/:id/ ─────────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """Full attempt detail with all answers for the grading page."""
        try:
            attempt = AssessmentAttempt.objects.select_related(
                "employee__user__profile",
                "assessment__course",
                "result",
            ).prefetch_related(
                "answers__question__options",
                "answers__selected_options",
            ).get(pk=pk)
        except AssessmentAttempt.DoesNotExist:
            return error_response(message="Attempt not found.", status_code=404)

        serializer = ReviewAttemptDetailSerializer(attempt)
        return success_response(data=serializer.data)

    # ── POST /review/:id/submit/ ──────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """
        Submit manual grades for all pending answers and finalize the result.
        Payload: { grades: [{ answer_id, earned_points }], instructor_feedback }
        """
        serializer = ManualGradeSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reviewer = self._get_reviewer_employee(request)
        service = ReviewService()

        try:
            result = service.submit_manual_grades(
                attempt_id=pk,
                grades=serializer.validated_data["grades"],
                instructor_feedback=serializer.validated_data.get("instructor_feedback", ""),
                graded_by_employee=reviewer,
            )
            return success_response(
                message="Assessment graded successfully.",
                data={
                    "status": result.status,
                    "score_percentage": float(result.score_percentage),
                    "total_score": float(result.total_score),
                    "grading_type": result.grading_type,
                },
            )
        except ValueError as e:
            return error_response(message=str(e))
        except Exception as e:
            return error_response(message=f"Grading failed: {str(e)}")

    # ── POST /review/:id/grant-retake/ ────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="grant-retake")
    def grant_retake(self, request, pk=None):
        """
        Grant one additional attempt to the learner for this assessment.
        Payload (optional): { note: "reason for retake" }
        """
        note = request.data.get("note", "")
        reviewer = self._get_reviewer_employee(request)
        service = ReviewService()

        try:
            grant = service.grant_retake(
                attempt_id=pk,
                granted_by_employee=reviewer,
                note=note,
            )
            serializer = RetakeGrantSerializer(grant)
            return created_response(
                message="Retake granted successfully. The learner can now start a new attempt.",
                data=serializer.data,
            )
        except ValueError as e:
            return error_response(message=str(e))


class AssessmentCatalogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Learner-facing catalog of published standalone assessments.
    GET /api/v1/assessment/catalog/
    """
    serializer_class = AssessmentCatalogSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.COMMON_READ.ASSESSMENT_CATALOG_VIEW

    def get_queryset(self):
        return (
            AssessmentMaster.objects.filter(
                status='PUBLISHED',
                course__isnull=True,
                lesson__isnull=True,
            )
            .prefetch_related('skill_mappings__skill', 'skill_mappings__skill_level')
            .order_by('title')
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
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


class AssessmentSkillMappingViewSet(viewsets.ModelViewSet):
    """
    CRUD for skill mappings on standalone assessments.
    GET/POST /api/v1/assessment/skill-mappings/?assessment=<id>
    """
    serializer_class = AssessmentSkillMappingSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.CONTENT_MANAGEMENT.ASSESSMENT_MANAGE

    def get_queryset(self):
        qs = AssessmentSkillMapping.objects.select_related(
            'assessment', 'skill', 'skill_level'
        )
        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            qs = qs.filter(assessment_id=assessment_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return created_response(
            message="Skill mapping added.",
            data=self.get_serializer(instance).data,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(message="Skill mapping removed.")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)


class QuestionMappingViewSet(viewsets.ModelViewSet):
    """
    CRUD for question mappings on CURATED standalone assessments.

    GET    /api/v1/assessment/question-mappings/?assessment=<id>
           Returns all questions mapped to the assessment (attempt__isnull=True).

    POST   /api/v1/assessment/question-mappings/
           Maps a question to an assessment.
           Payload: { assessment: int, question: uuid, display_order: int }

    DELETE /api/v1/assessment/question-mappings/:id/
           Removes a question mapping.

    POST   /api/v1/assessment/question-mappings/reorder/
           Bulk-updates display_order.
           Payload: { mappings: [{ id: int, display_order: int }] }
    """
    from .serializers import AssessmentQuestionMappingSerializer
    serializer_class = AssessmentQuestionMappingSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.CONTENT_MANAGEMENT.ASSESSMENT_MANAGE

    def get_queryset(self):
        from .models import AssessmentQuestionMapping
        qs = AssessmentQuestionMapping.objects.filter(
            attempt__isnull=True,
        ).select_related('question__skill', 'question__skill_level').prefetch_related(
            'question__options'
        )
        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            qs = qs.filter(assessment_id=assessment_id)
        return qs.order_by('display_order')

    def create(self, request, *args, **kwargs):
        from .models import AssessmentQuestionMapping
        from .serializers import AssessmentQuestionMappingSerializer

        assessment_id = request.data.get('assessment')
        question_id   = request.data.get('question')
        display_order = request.data.get('display_order', 1)

        if not assessment_id or not question_id:
            return error_response(message="assessment and question are required.")

        # Prevent duplicate mapping
        if AssessmentQuestionMapping.objects.filter(
            assessment_id=assessment_id,
            question_id=question_id,
            attempt__isnull=True,
        ).exists():
            return error_response(message="This question is already mapped to the assessment.")

        instance = AssessmentQuestionMapping.objects.create(
            assessment_id=assessment_id,
            question_id=question_id,
            display_order=display_order,
            weight_points=1.00,
            time_limit_seconds=0,
        )
        return created_response(
            message="Question mapped to assessment.",
            data=AssessmentQuestionMappingSerializer(instance).data,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(message="Question mapping removed.")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        from .serializers import AssessmentQuestionMappingSerializer
        serializer = AssessmentQuestionMappingSerializer(queryset, many=True)
        return success_response(data=serializer.data)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        POST /assessment/question-mappings/reorder/
        Bulk-updates display_order for a list of mappings.
        Payload: { mappings: [{ id: int, display_order: int }] }
        """
        from .models import AssessmentQuestionMapping
        mappings_data = request.data.get('mappings', [])
        if not mappings_data:
            return error_response(message="mappings list is required.")

        ids = [m['id'] for m in mappings_data]
        mapping_objs = {
            m.id: m
            for m in AssessmentQuestionMapping.objects.filter(id__in=ids, attempt__isnull=True)
        }

        updated = []
        for item in mappings_data:
            obj = mapping_objs.get(item['id'])
            if obj:
                obj.display_order = item['display_order']
                updated.append(obj)

        AssessmentQuestionMapping.objects.bulk_update(updated, ['display_order'])
        return success_response(
            message=f"{len(updated)} mapping(s) reordered.",
            data={"updated": len(updated)},
        )


class SkillUpgradeProposalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Skill upgrade proposals — approve-only workflow.

    GET  /api/v1/assessment/skill-upgrade-proposals/          — list pending proposals
    POST /api/v1/assessment/skill-upgrade-proposals/:id/approve/ — approve a proposal
    """
    serializer_class = SkillUpgradeProposalSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.CONTENT_MANAGEMENT.SKILL_UPGRADE_APPROVE

    def get_queryset(self):
        qs = SkillUpgradeProposal.objects.select_related(
            'employee__user__profile',
            'skill',
            'proposed_level',
            'assessment_attempt__assessment',
            'approved_by__user__profile',
        ).order_by('-created_at')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.filter(status='PENDING')  # default: show pending only

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(data=self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Approve a skill upgrade proposal.
        - Updates EmployeeSkill to the proposed level (if not already at or above it).
        - Writes EmployeeSkillHistory via the signal with change_reason=ASSESSMENT_APPROVED.
        - Notifies the learner with old level → new level context.
        - Skips the skill update silently if the employee already holds an equal or higher level.
        """
        from django.utils import timezone
        from apps.skill_management.models import EmployeeSkill, EmployeeSkillHistory, SkillIdentifiedBy

        proposal = self.get_object()

        if proposal.status == 'APPROVED':
            return error_response(message="This proposal has already been approved.")

        approver = getattr(request.user, 'employee_record', None)
        approver = approver.first() if approver else None

        # Capture old level before any update for the notification message
        existing = EmployeeSkill.objects.filter(
            employee=proposal.employee,
            skill=proposal.skill,
            is_active=True,
        ).select_related('current_level').first()

        old_level_name = existing.current_level.level_name if existing else None

        # Update EmployeeSkill only if proposed level is strictly higher
        if not existing or existing.current_level.level_rank < proposal.proposed_level.level_rank:
            if existing:
                # Update in-place so the pre_save signal captures the old level
                existing.current_level = proposal.proposed_level
                existing.identified_by = SkillIdentifiedBy.ASSESSMENT
                existing.is_active = True
                existing._changed_by    = approver
                existing._change_reason = EmployeeSkillHistory.ChangeReason.ASSESSMENT_APPROVED
                existing.save()
            else:
                # No existing row — create fresh
                new_skill = EmployeeSkill(
                    employee=proposal.employee,
                    skill=proposal.skill,
                    current_level=proposal.proposed_level,
                    identified_by=SkillIdentifiedBy.ASSESSMENT,
                    is_active=True,
                )
                new_skill._changed_by    = approver
                new_skill._change_reason = EmployeeSkillHistory.ChangeReason.ASSESSMENT_APPROVED
                new_skill.save()

        # Mark proposal approved
        proposal.status = 'APPROVED'
        proposal.approved_by = approver
        proposal.approved_at = timezone.now()
        proposal.save(update_fields=['status', 'approved_by', 'approved_at'])

        # Notify the learner with old level → new level context
        try:
            from apps.notifications.models import Notification
            from apps.notifications.constants import NotificationType

            approver_name = "Admin"
            if approver:
                try:
                    p = approver.user.profile
                    approver_name = f"{p.first_name} {p.last_name}".strip() or approver.employee_code
                except Exception:
                    approver_name = approver.employee_code

            if old_level_name:
                level_change = f"from {old_level_name} to {proposal.proposed_level.level_name}"
            else:
                level_change = f"to {proposal.proposed_level.level_name}"

            Notification.objects.create(
                user=proposal.employee.user,
                notification_type=NotificationType.SKILL_UPGRADE,
                title="Skill upgrade approved",
                message=(
                    f"Your skill upgrade for \"{proposal.skill.skill_name}\" "
                    f"{level_change} has been approved by {approver_name}."
                ),
                action_url="/my-skills",
                entity_type="SkillUpgradeProposal",
                entity_id=str(proposal.id),
            )
        except Exception:
            pass

        return success_response(
            message="Skill upgrade approved successfully.",
            data=self.get_serializer(proposal).data,
        )
