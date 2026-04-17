from common.repositories.base import BaseRepository
from .models import (
    AssessmentMaster, QuestionBank, QuestionOption,
    AssessmentQuestionMapping, AssessmentAttempt,
    UserAnswer, AssessmentResult
)


class AssessmentRepository(BaseRepository[AssessmentMaster]):
    model = AssessmentMaster

    def get_full_quiz_details(self, quiz_id):
        """
        Fetches quiz settings along with question mappings and options.
        Used for the player initialization.
        """
        return self.model.objects.select_related('course', 'lesson').prefetch_related(
            'question_mappings__question__options'
        ).filter(id=quiz_id).first()


class QuestionRepository(BaseRepository[QuestionBank]):
    model = QuestionBank


class AttemptRepository(BaseRepository[AssessmentAttempt]):
    model = AssessmentAttempt

    def get_active_attempt(self, employee_id, assessment_id):
        """Checks if a student has an ongoing (unsubmitted) attempt."""
        return self.model.objects.filter(
            employee_id=employee_id,
            assessment_id=assessment_id,
            status="IN_PROGRESS"
        ).first()

    def get_attempt_history(self, employee_id, assessment_id):
        """Fetch all previous attempts for a specific quiz."""
        return self.model.objects.filter(
            employee_id=employee_id,
            assessment_id=assessment_id
        ).select_related('result').order_by('-started_at')


class AnswerRepository(BaseRepository[UserAnswer]):
    model = UserAnswer


class ResultRepository(BaseRepository[AssessmentResult]):
    model = AssessmentResult
