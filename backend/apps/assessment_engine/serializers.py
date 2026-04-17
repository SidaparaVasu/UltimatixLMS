from rest_framework import serializers
from .models import (
    AssessmentMaster, QuestionBank, QuestionOption, 
    AssessmentQuestionMapping, AssessmentAttempt, 
    UserAnswer, AssessmentResult
)

# --- STUDIO CONTEXT (Instructors) ---

class QuestionOptionStudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "is_correct", "display_order", "feedback_text"]


class QuestionBankStudioSerializer(serializers.ModelSerializer):
    options = QuestionOptionStudioSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionBank
        fields = [
            "id", "question_text", "question_type", "scenario_text", 
            "explanation_text", "difficulty_complexity", "is_active", "options"
        ]


class AssessmentMasterStudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentMaster
        fields = "__all__"


# --- LEARNER CONTEXT (Students - Sanitized) ---

class QuestionOptionLearnerSerializer(serializers.ModelSerializer):
    """Sanitized: No is_correct or feedback_text exposed here."""
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "display_order"]


class QuestionLearnerSerializer(serializers.ModelSerializer):
    """Sanitized representation of a question for an active attempt."""
    options = QuestionOptionLearnerSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionBank
        fields = ["id", "question_text", "question_type", "scenario_text", "options"]


class AssessmentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentAttempt
        fields = "__all__"
        read_only_fields = ["id", "started_at", "expires_at", "status"]


class UserAnswerSubmitSerializer(serializers.ModelSerializer):
    """Used for receiving learner responses."""
    class Meta:
        model = UserAnswer
        fields = ["question", "selected_option", "answer_text", "uploaded_file"]


class AssessmentResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentResult
        fields = "__all__"
