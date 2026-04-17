from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from common.response import success_response, error_response, created_response
from .models import (
    AssessmentMaster, QuestionBank, AssessmentAttempt, AssessmentResult
)
from .serializers import (
    AssessmentMasterStudioSerializer, QuestionBankStudioSerializer,
    AssessmentAttemptSerializer, UserAnswerSubmitSerializer, 
    AssessmentResultSerializer, QuestionLearnerSerializer
)
from .services import AssessmentBuildService, AttemptService, GradingService


class AssessmentStudioViewSet(viewsets.ModelViewSet):
    """
    Studio API for instructors to manage assessments.
    """
    queryset = AssessmentMaster.objects.all()
    serializer_class = AssessmentMasterStudioSerializer
    permission_classes = [permissions.IsAuthenticated] # TODO: Add IsInstructor permission

    @action(detail=True, methods=['post'], url_path='sync-questions')
    def sync_questions(self, request, pk=None):
        """
        Bulk links questions to the assessment.
        Expects: data: [ { question_id: uuid, weight: 1.0 }, ... ]
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
    """
    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankStudioSerializer
    permission_classes = [permissions.IsAuthenticated]


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

    @action(detail=True, methods=['get'], url_path='questions')
    def get_questions(self, request, pk=None):
        """
        Returns sanitized questions for the active attempt.
        Handles randomization if configured.
        """
        service = AttemptService()
        try:
            mappings = service.get_randomized_questions(pk)
            # We want just the question data
            questions = [m.question for m in mappings]
            serializer = QuestionLearnerSerializer(questions, many=True)
            return success_response(data=serializer.data)
        except Exception as e:
            return error_response(message=str(e))

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """
        Submits answers and triggers the grading engine.
        Payload: { answers: [ { question: uuid, selected_option: id, answer_text: str }, ... ] }
        """
        attempt = self.get_object()
        if attempt.status == "COMPLETED":
            return error_response(message="Attempt already submitted.")

        # 1. Save answers
        answers_data = request.data.get('answers', [])
        for ans_data in answers_data:
            ans_data['attempt'] = attempt.id
            serializer = UserAnswerSubmitSerializer(data=ans_data)
            if serializer.is_valid():
                serializer.save(attempt=attempt)

        # 2. Trigger Grader
        grader = GradingService()
        try:
            result = grader.grade_attempt(attempt.id)
            res_serializer = AssessmentResultSerializer(result)
            return success_response(
                message="Assessment submitted and graded.",
                data=res_serializer.data
            )
        except Exception as e:
            return error_response(message=f"Grading failed: {str(e)}")
