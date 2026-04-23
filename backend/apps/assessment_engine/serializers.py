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
    """
    Full assessment serializer including nested questions for the Studio.
    """
    questions = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentMaster
        fields = "__all__"

    def get_questions(self, obj):
        """Return questions ordered by their mapping display_order."""
        mappings = AssessmentQuestionMapping.objects.filter(
            assessment=obj
        ).select_related('question').prefetch_related(
            'question__options'
        ).order_by('display_order')

        result = []
        for mapping in mappings:
            q = mapping.question
            result.append({
                'id': str(q.id),
                'question_text': q.question_text,
                'question_type': q.question_type,
                'scenario_text': q.scenario_text,
                'explanation_text': q.explanation_text,
                'difficulty_complexity': q.difficulty_complexity,
                'is_active': q.is_active,
                'options': [
                    {
                        'id': opt.id,
                        'option_text': opt.option_text,
                        'is_correct': opt.is_correct,
                        'display_order': opt.display_order,
                        'feedback_text': opt.feedback_text,
                    }
                    for opt in q.options.all().order_by('display_order')
                ],
            })
        return result


# --- LEARNER CONTEXT (Students - Sanitized) ---

class AssessmentLearnerSerializer(serializers.ModelSerializer):
    """
    Safe assessment metadata for learners.
    No questions, no correct answers — just the info needed for the intro screen.
    Also includes attempt history for the current user (injected via context).
    """
    question_count = serializers.SerializerMethodField()
    attempts_used = serializers.SerializerMethodField()
    attempts_remaining = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentMaster
        fields = [
            "id", "title", "description",
            "duration_minutes", "passing_percentage",
            "retake_limit", "is_randomized", "negative_marking_enabled",
            "question_count", "attempts_used", "attempts_remaining",
        ]

    def get_question_count(self, obj):
        return obj.question_mappings.count()

    def _get_attempts_used(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'employee_record'):
            return 0
        employee = request.user.employee_record.first()
        if not employee:
            return 0
        return AssessmentAttempt.objects.filter(
            assessment=obj,
            employee=employee
        ).count()

    def get_attempts_used(self, obj):
        return self._get_attempts_used(obj)

    def get_attempts_remaining(self, obj):
        used = self._get_attempts_used(obj)
        return max(0, obj.retake_limit - used)


class QuestionOptionLearnerSerializer(serializers.ModelSerializer):
    """Sanitized: No is_correct or feedback_text."""
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "display_order"]


class QuestionLearnerSerializer(serializers.ModelSerializer):
    """Sanitized question for an active attempt."""
    options = QuestionOptionLearnerSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionBank
        fields = ["id", "question_text", "question_type", "scenario_text", "options"]


class UserAnswerLifecycleSerializer(serializers.ModelSerializer):
    """
    Sent to learner when fetching next question.
    Includes question_number and total_questions for progress display.
    """
    question = QuestionLearnerSerializer(read_only=True)
    time_limit_seconds = serializers.SerializerMethodField()
    question_number = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()

    class Meta:
        model = UserAnswer
        fields = [
            "question", "status", "started_at",
            "time_limit_seconds", "question_number", "total_questions",
        ]

    def get_time_limit_seconds(self, obj):
        # Fetch from the mapping
        mapping = AssessmentQuestionMapping.objects.filter(
            assessment=obj.attempt.assessment,
            question=obj.question
        ).first()
        return mapping.time_limit_seconds if mapping else 0

    def get_question_number(self, obj):
        """1-based index of this question in the attempt."""
        answered_count = UserAnswer.objects.filter(
            attempt=obj.attempt,
            status__in=["ATTEMPTED", "TIMED_OUT"]
        ).count()
        return answered_count + 1

    def get_total_questions(self, obj):
        return obj.attempt.answers.count()


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


class AssessmentResultSerializer(serializers.ModelSerializer):
    """
    Result with enriched stats for the result screen.
    """
    total_questions = serializers.SerializerMethodField()
    attempted_count = serializers.SerializerMethodField()
    correct_count = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentResult
        fields = [
            "id", "attempt", "total_score", "score_percentage",
            "status", "grading_type", "instructor_feedback",
            "graded_at", "total_questions", "attempted_count", "correct_count",
        ]

    def get_total_questions(self, obj):
        return obj.attempt.answers.count()

    def get_attempted_count(self, obj):
        return obj.attempt.answers.filter(status="ATTEMPTED").count()

    def get_correct_count(self, obj):
        """
        Count questions where earned_points > 0 (auto-graded correct answers).
        Only meaningful for auto-graded attempts.
        """
        return obj.attempt.answers.filter(
            is_auto_graded=True,
            earned_points__gt=0
        ).count()


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
