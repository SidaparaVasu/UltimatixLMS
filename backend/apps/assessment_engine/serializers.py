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
        fields = ["question", "selected_options", "answer_text", "uploaded_file"]


class UserAnswerLifecycleSerializer(serializers.ModelSerializer):
    """Sent to learner when fetching next question."""
    question = QuestionLearnerSerializer(read_only=True)
    time_limit_seconds = serializers.SerializerMethodField()

    class Meta:
        model = UserAnswer
        fields = ["question", "status", "started_at", "time_limit_seconds"]

    def get_time_limit_seconds(self, obj):
        # Fetch from the mapping
        mapping = AssessmentQuestionMapping.objects.filter(
            assessment=obj.attempt.assessment,
            question=obj.question
        ).first()
        return mapping.time_limit_seconds if mapping else 0


class AssessmentResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentResult
        fields = "__all__"


# --- WRITABLE SERIALIZERS (Studio — Question create/update with nested options) ---

class QuestionOptionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["option_text", "is_correct", "display_order", "feedback_text"]


class QuestionBankWriteSerializer(serializers.ModelSerializer):
    options = QuestionOptionWriteSerializer(many=True, required=False)

    class Meta:
        model = QuestionBank
        fields = [
            "id", "question_text", "question_type", "scenario_text",
            "explanation_text", "difficulty_complexity", "options",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        question = QuestionBank.objects.create(**validated_data)
        for i, opt in enumerate(options_data):
            opt.setdefault("display_order", i + 1)
            QuestionOption.objects.create(question=question, **opt)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop("options", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if options_data is not None:
            instance.options.all().delete()
            for i, opt in enumerate(options_data):
                opt.setdefault("display_order", i + 1)
                QuestionOption.objects.create(question=instance, **opt)
        return instance
