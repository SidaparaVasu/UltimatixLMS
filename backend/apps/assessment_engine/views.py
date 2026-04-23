from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from common.response import success_response, error_response, created_response
from .models import (
    AssessmentMaster, QuestionBank, AssessmentAttempt, AssessmentResult
)
from .serializers import (
    AssessmentMasterStudioSerializer, AssessmentLearnerSerializer,
    QuestionBankStudioSerializer, QuestionBankWriteSerializer,
    AssessmentAttemptSerializer, UserAnswerSubmitSerializer,
    AssessmentResultSerializer, QuestionLearnerSerializer,
    UserAnswerLifecycleSerializer,
)
from .services import AssessmentBuildService, AttemptService, GradingService


class AssessmentStudioViewSet(viewsets.ModelViewSet):
    """
    Studio API for instructors to manage assessments.
    Uses the standard success/error response envelope so the frontend
    handleApiResponse helper can parse results correctly.
    """
    queryset = AssessmentMaster.objects.all()
    serializer_class = AssessmentMasterStudioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson_id')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
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


class QuestionBankViewSet(viewsets.ModelViewSet):
    """
    API for managing the central question pool.
    Uses the standard response envelope.
    """
    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankStudioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return QuestionBankWriteSerializer
        return QuestionBankStudioSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return created_response(
            message="Question created successfully.",
            data=QuestionBankStudioSerializer(instance).data,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return success_response(
            message="Question updated successfully.",
            data=QuestionBankStudioSerializer(instance).data,
        )


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


class AssessmentLearnerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Safe read-only endpoint for learners to fetch assessment metadata.

    GET /api/v1/assessment/learner/?lesson_id=<id>
      Returns assessment info for a lesson: title, duration, passing %,
      retake limit, question count, attempts used/remaining.
      No questions, no correct answers exposed.
    """
    queryset = AssessmentMaster.objects.filter(status__in=['PUBLISHED', 'DRAFT'])
    serializer_class = AssessmentLearnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson_id')
        if lesson_id:
            qs = qs.filter(lesson_id=lesson_id)
        return qs

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
