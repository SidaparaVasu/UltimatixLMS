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
                return success_response(message="No more questions in this assessment.", data={"completed": True})
            
            from .serializers import UserAnswerLifecycleSerializer
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
