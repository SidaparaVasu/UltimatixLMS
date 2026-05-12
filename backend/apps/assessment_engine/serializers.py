from rest_framework import serializers
from .models import (
    AssessmentMaster, QuestionBank, QuestionOption, 
    AssessmentQuestionMapping, AssessmentAttempt, 
    UserAnswer, AssessmentResult, AssessmentRetakeGrant
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
    Full assessment serializer including nested questions and skill mappings for the Studio.
    """
    questions = serializers.SerializerMethodField()
    skill_mappings = serializers.SerializerMethodField()

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

    def get_skill_mappings(self, obj):
        """Return all skill mappings for this assessment."""
        from .models import AssessmentSkillMapping
        mappings = AssessmentSkillMapping.objects.filter(
            assessment=obj
        ).select_related('skill', 'skill_level')
        return [
            {
                'id':              m.id,
                'assessment':      m.assessment_id,
                'skill':           m.skill_id,
                'skill_name':      m.skill.skill_name,
                'skill_level':     m.skill_level_id,
                'skill_level_name': m.skill_level.level_name,
                'skill_level_rank': m.skill_level.level_rank,
            }
            for m in mappings
        ]


# --- LEARNER CONTEXT (Students - Sanitized) ---

class AssessmentLearnerSerializer(serializers.ModelSerializer):
    """
    Safe assessment metadata for learners.
    No questions, no correct answers — just the info needed for the intro screen.
    Also includes attempt history for the current user (injected via context).
    """
    question_count      = serializers.SerializerMethodField()
    attempts_used       = serializers.SerializerMethodField()
    attempts_remaining  = serializers.SerializerMethodField()
    last_result_status  = serializers.SerializerMethodField()
    last_attempt_id     = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentMaster
        fields = [
            "id", "title", "description",
            "duration_minutes", "passing_percentage",
            "retake_limit", "is_randomized", "negative_marking_enabled",
            "question_count", "attempts_used", "attempts_remaining",
            "last_result_status", "last_attempt_id",
        ]

    def _get_employee(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'employee_record'):
            return None
        return request.user.employee_record.first()

    def get_question_count(self, obj):
        return obj.question_mappings.count()

    def _get_attempts_used(self, obj):
        employee = self._get_employee(obj)
        if not employee:
            return 0
        return AssessmentAttempt.objects.filter(
            assessment=obj,
            employee=employee
        ).count()

    def get_attempts_used(self, obj):
        return self._get_attempts_used(obj)

    def get_attempts_remaining(self, obj):
        from .repositories import RetakeGrantRepository
        employee = self._get_employee(obj)
        extra = RetakeGrantRepository().count_grants(employee.id, obj.id) if employee else 0
        used = self._get_attempts_used(obj)
        return max(0, obj.retake_limit + extra - used)

    def get_last_result_status(self, obj):
        """
        Returns the result status of the most recent COMPLETED attempt:
        'PASS', 'FAIL', 'PENDING', or None if no attempt exists.
        """
        employee = self._get_employee(obj)
        if not employee:
            return None
        last_attempt = AssessmentAttempt.objects.filter(
            assessment=obj,
            employee=employee,
            status="COMPLETED",
        ).order_by('-started_at').first()
        if not last_attempt:
            return None
        try:
            return last_attempt.result.status
        except Exception:
            return None

    def get_last_attempt_id(self, obj):
        """
        Returns the UUID of the most recent COMPLETED attempt, or None.
        Used by the frontend to fetch the result directly without starting a new attempt.
        """
        employee = self._get_employee(obj)
        if not employee:
            return None
        last_attempt = AssessmentAttempt.objects.filter(
            assessment=obj,
            employee=employee,
            status="COMPLETED",
        ).order_by('-started_at').first()
        return str(last_attempt.id) if last_attempt else None


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
    Result with enriched stats and per-question review for the result screen.
    """
    total_questions = serializers.SerializerMethodField()
    attempted_count = serializers.SerializerMethodField()
    correct_count   = serializers.SerializerMethodField()
    answers         = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentResult
        fields = [
            "id", "attempt", "total_score", "score_percentage",
            "status", "grading_type", "instructor_feedback",
            "graded_at", "total_questions", "attempted_count",
            "correct_count", "answers",
        ]

    def get_total_questions(self, obj):
        return obj.attempt.answers.count()

    def get_attempted_count(self, obj):
        return obj.attempt.answers.filter(status="ATTEMPTED").count()

    def get_correct_count(self, obj):
        # Count any answered question that earned points — auto-graded or manually reviewed.
        return obj.attempt.answers.filter(
            status="ATTEMPTED",
            earned_points__gt=0
        ).count()

    def get_answers(self, obj):
        """
        Returns per-question review data for the Coursera-style result screen.
        Each entry includes:
          - question text, type, scenario
          - learner's selected options / answer text
          - correct options (for auto-graded questions)
          - earned_points, max_points, is_auto_graded
          - is_manually_graded: True when this answer has been reviewed by an instructor.
            Derived from the result's grading_type so the frontend can distinguish
            "awaiting review" from "already reviewed" — both have is_auto_graded=False.
        """
        answers = obj.attempt.answers.select_related(
            'question'
        ).prefetch_related(
            'question__options',
            'selected_options',
        ).order_by('id')

        # True once the instructor has submitted grades for this attempt
        result_is_graded = obj.grading_type == "MANUALLY_GRADED"

        result = []
        for answer in answers:
            q = answer.question
            mapping = AssessmentQuestionMapping.objects.filter(
                assessment=obj.attempt.assessment,
                question=q,
            ).first()
            max_pts = float(mapping.weight_points) if mapping else 1.0

            correct_options = [
                {"id": o.id, "option_text": o.option_text}
                for o in q.options.filter(is_correct=True).order_by("display_order")
            ]
            selected_options = [
                {"id": o.id, "option_text": o.option_text}
                for o in answer.selected_options.all().order_by("display_order")
            ]

            # A manually-graded answer is one that was not auto-graded AND the
            # result has been finalised by an instructor (grading_type=MANUALLY_GRADED).
            is_manually_graded = not answer.is_auto_graded and result_is_graded

            result.append({
                "question_id":        str(q.id),
                "question_text":      q.question_text,
                "question_type":      q.question_type,
                "scenario_text":      q.scenario_text,
                "explanation_text":   q.explanation_text,
                "answer_text":        answer.answer_text,
                "status":             answer.status,
                "is_auto_graded":     answer.is_auto_graded,
                "is_manually_graded": is_manually_graded,
                "earned_points":      float(answer.earned_points),
                "max_points":         max_pts,
                "selected_options":   selected_options,
                "correct_options":    correct_options,
            })
        return result


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
            "explanation_text", "difficulty_complexity",
            "skill", "skill_level",
            "options",
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


# ---------------------------------------------------------------------------
# REVIEW CONTEXT (Instructor / Admin manual grading)
# ---------------------------------------------------------------------------

class ReviewAnswerSerializer(serializers.ModelSerializer):
    """
    Full answer detail for the review page.
    Includes question text, learner's response, options with correct flags,
    and current earned points.
    """
    question_text     = serializers.CharField(source="question.question_text", read_only=True)
    question_type     = serializers.CharField(source="question.question_type", read_only=True)
    scenario_text     = serializers.CharField(source="question.scenario_text", read_only=True)
    explanation_text  = serializers.CharField(source="question.explanation_text", read_only=True)
    max_points        = serializers.SerializerMethodField()
    selected_options  = serializers.SerializerMethodField()
    correct_options   = serializers.SerializerMethodField()

    class Meta:
        model = UserAnswer
        fields = [
            "id", "question", "question_text", "question_type",
            "scenario_text", "explanation_text",
            "status", "answer_text", "uploaded_file",
            "is_auto_graded", "earned_points", "max_points",
            "selected_options", "correct_options",
        ]

    def get_max_points(self, obj):
        mapping = AssessmentQuestionMapping.objects.filter(
            assessment=obj.attempt.assessment,
            question=obj.question,
        ).first()
        return float(mapping.weight_points) if mapping else 1.0

    def get_selected_options(self, obj):
        return [
            {"id": o.id, "option_text": o.option_text}
            for o in obj.selected_options.all().order_by("display_order")
        ]

    def get_correct_options(self, obj):
        return [
            {"id": o.id, "option_text": o.option_text}
            for o in obj.question.options.filter(is_correct=True).order_by("display_order")
        ]


class ReviewAttemptListSerializer(serializers.ModelSerializer):
    """
    Compact row for the review queue list page.
    """
    learner_name      = serializers.SerializerMethodField()
    employee_code     = serializers.CharField(source="employee.employee_code", read_only=True)
    assessment_title  = serializers.CharField(source="assessment.title", read_only=True)
    course_title      = serializers.SerializerMethodField()
    auto_score        = serializers.SerializerMethodField()
    total_points      = serializers.SerializerMethodField()
    pending_count     = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentAttempt
        fields = [
            "id", "employee_code", "learner_name",
            "assessment_title", "course_title",
            "submitted_at", "auto_score", "total_points", "pending_count",
        ]

    def get_learner_name(self, obj):
        try:
            p = obj.employee.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.employee.user.username
        except Exception:
            return obj.employee.user.username

    def get_course_title(self, obj):
        return obj.assessment.course.course_title if obj.assessment.course else None

    def get_auto_score(self, obj):
        return float(
            obj.answers.filter(is_auto_graded=True)
            .aggregate(total=__import__('django.db.models', fromlist=['Sum']).Sum('earned_points'))
            ['total'] or 0
        )

    def get_total_points(self, obj):
        from django.db.models import Sum
        return float(
            AssessmentQuestionMapping.objects.filter(assessment=obj.assessment)
            .aggregate(total=Sum('weight_points'))['total'] or 0
        )

    def get_pending_count(self, obj):
        return obj.answers.filter(is_auto_graded=False, status="ATTEMPTED").count()


class ReviewAttemptDetailSerializer(serializers.ModelSerializer):
    """
    Full attempt detail for the grading page.
    """
    learner_name     = serializers.SerializerMethodField()
    employee_code    = serializers.CharField(source="employee.employee_code", read_only=True)
    assessment_title = serializers.CharField(source="assessment.title", read_only=True)
    course_title     = serializers.SerializerMethodField()
    lesson_id        = serializers.IntegerField(source="assessment.lesson_id", read_only=True)
    passing_percentage = serializers.DecimalField(
        source="assessment.passing_percentage", max_digits=5, decimal_places=2, read_only=True
    )
    answers          = ReviewAnswerSerializer(many=True, read_only=True)
    result           = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentAttempt
        fields = [
            "id", "employee_code", "learner_name",
            "assessment", "assessment_title", "course_title",
            "lesson_id", "passing_percentage", "submitted_at", "answers", "result",
        ]

    def get_learner_name(self, obj):
        try:
            p = obj.employee.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.employee.user.username
        except Exception:
            return obj.employee.user.username

    def get_course_title(self, obj):
        return obj.assessment.course.course_title if obj.assessment.course else None

    def get_result(self, obj):
        try:
            r = obj.result
            return {
                "id": r.id,
                "total_score": float(r.total_score),
                "score_percentage": float(r.score_percentage),
                "status": r.status,
                "grading_type": r.grading_type,
                "instructor_feedback": r.instructor_feedback,
                "graded_at": r.graded_at,
            }
        except AssessmentResult.DoesNotExist:
            return None


class ManualGradeItemSerializer(serializers.Serializer):
    """One scored answer in the manual grading payload."""
    answer_id   = serializers.IntegerField()
    earned_points = serializers.DecimalField(max_digits=5, decimal_places=2)


class ManualGradeSubmitSerializer(serializers.Serializer):
    """Payload for POST /review/:attemptId/submit/"""
    grades               = ManualGradeItemSerializer(many=True)
    instructor_feedback  = serializers.CharField(required=False, allow_blank=True, default="")


class RetakeGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentRetakeGrant
        fields = ["id", "assessment", "employee", "granted_by", "note", "granted_at"]
        read_only_fields = ["id", "granted_by", "granted_at"]


# ---------------------------------------------------------------------------
# STANDALONE ASSESSMENT — Skill mapping, catalog, upgrade proposals
# ---------------------------------------------------------------------------

class AssessmentSkillMappingSerializer(serializers.ModelSerializer):
    skill_name       = serializers.CharField(source="skill.skill_name",       read_only=True)
    skill_level_name = serializers.CharField(source="skill_level.level_name", read_only=True)
    skill_level_rank = serializers.IntegerField(source="skill_level.level_rank", read_only=True)

    class Meta:
        from .models import AssessmentSkillMapping
        model = AssessmentSkillMapping
        fields = ["id", "assessment", "skill", "skill_name", "skill_level", "skill_level_name", "skill_level_rank"]


class AssessmentCatalogSerializer(serializers.ModelSerializer):
    """
    Learner-facing catalog card for standalone assessments.
    Includes attempt history, cooldown status, and skill mappings.
    No questions, no correct answers exposed.
    """
    question_count           = serializers.SerializerMethodField()
    attempts_used            = serializers.SerializerMethodField()
    attempts_remaining       = serializers.SerializerMethodField()
    last_result_status       = serializers.SerializerMethodField()
    last_attempt_id          = serializers.SerializerMethodField()
    active_attempt_id        = serializers.SerializerMethodField()
    cooldown_remaining_hours = serializers.SerializerMethodField()
    skill_mappings           = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentMaster
        fields = [
            "id", "title", "description",
            "duration_minutes", "passing_percentage",
            "retake_limit", "retake_cooldown_hours",
            "is_randomized", "negative_marking_enabled",
            "number_of_questions",
            "question_count", "attempts_used", "attempts_remaining",
            "last_result_status", "last_attempt_id", "active_attempt_id",
            "cooldown_remaining_hours", "skill_mappings",
        ]

    def _get_employee(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'employee_record'):
            return None
        return request.user.employee_record.first()

    def _get_last_completed_attempt(self, obj):
        employee = self._get_employee(obj)
        if not employee:
            return None
        return (
            AssessmentAttempt.objects.filter(
                assessment=obj, employee=employee, status="COMPLETED"
            )
            .order_by('-started_at')
            .select_related('result')
            .first()
        )

    def get_question_count(self, obj):
        return obj.number_of_questions

    def _get_attempts_used(self, obj):
        employee = self._get_employee(obj)
        if not employee:
            return 0
        return AssessmentAttempt.objects.filter(assessment=obj, employee=employee).count()

    def get_attempts_used(self, obj):
        return self._get_attempts_used(obj)

    def get_attempts_remaining(self, obj):
        from .repositories import RetakeGrantRepository
        employee = self._get_employee(obj)
        extra = RetakeGrantRepository().count_grants(employee.id, obj.id) if employee else 0
        return max(0, obj.retake_limit + extra - self._get_attempts_used(obj))

    def get_last_result_status(self, obj):
        attempt = self._get_last_completed_attempt(obj)
        if not attempt:
            return None
        try:
            return attempt.result.status
        except Exception:
            return None

    def get_last_attempt_id(self, obj):
        attempt = self._get_last_completed_attempt(obj)
        return str(attempt.id) if attempt else None

    def get_active_attempt_id(self, obj):
        """
        Returns the UUID of the current IN_PROGRESS attempt, or None.
        Used by the frontend to show a "Resume" button instead of "Start Assessment".
        """
        employee = self._get_employee(obj)
        if not employee:
            return None
        attempt = AssessmentAttempt.objects.filter(
            assessment=obj,
            employee=employee,
            status="IN_PROGRESS",
        ).first()
        return str(attempt.id) if attempt else None

    def get_cooldown_remaining_hours(self, obj):
        """
        Returns hours remaining in cooldown after a failed attempt, or 0 if no cooldown.
        """
        if obj.retake_cooldown_hours == 0:
            return 0
        attempt = self._get_last_completed_attempt(obj)
        if not attempt or not attempt.submitted_at:
            return 0
        try:
            if attempt.result.status != "FAIL":
                return 0
        except Exception:
            return 0
        from django.utils import timezone
        from datetime import timedelta
        cooldown_ends = attempt.submitted_at + timedelta(hours=obj.retake_cooldown_hours)
        remaining = cooldown_ends - timezone.now()
        if remaining.total_seconds() <= 0:
            return 0
        return int(remaining.total_seconds() / 3600) + 1

    def get_skill_mappings(self, obj):
        from .models import AssessmentSkillMapping
        mappings = AssessmentSkillMapping.objects.filter(
            assessment=obj
        ).select_related("skill", "skill_level")
        return [
            {
                "skill_id":         m.skill_id,
                "skill_name":       m.skill.skill_name,
                "skill_level_id":   m.skill_level_id,
                "skill_level_name": m.skill_level.level_name,
                "skill_level_rank": m.skill_level.level_rank,
            }
            for m in mappings
        ]


class SkillUpgradeProposalSerializer(serializers.ModelSerializer):
    employee_name    = serializers.SerializerMethodField()
    employee_code    = serializers.CharField(source="employee.employee_code", read_only=True)
    skill_name       = serializers.CharField(source="skill.skill_name",       read_only=True)
    proposed_level_name = serializers.CharField(source="proposed_level.level_name", read_only=True)
    assessment_title = serializers.CharField(source="assessment_attempt.assessment.title", read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        from .models import SkillUpgradeProposal
        model = SkillUpgradeProposal
        fields = [
            "id", "employee_code", "employee_name",
            "skill", "skill_name",
            "proposed_level", "proposed_level_name",
            "assessment_attempt", "assessment_title",
            "status", "approved_by", "approved_by_name", "approved_at",
            "created_at",
        ]
        read_only_fields = ["id", "status", "approved_by", "approved_at", "created_at"]

    def get_employee_name(self, obj):
        try:
            p = obj.employee.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.employee.user.username
        except Exception:
            return obj.employee.user.username

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return None
        try:
            p = obj.approved_by.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.approved_by.user.username
        except Exception:
            return obj.approved_by.user.username


class QuestionBankWithSkillSerializer(serializers.ModelSerializer):
    """
    Extended question serializer that includes skill and skill_level fields.
    Used for the Question Bank management page.
    """
    options          = QuestionOptionStudioSerializer(many=True, read_only=True)
    skill_name       = serializers.CharField(source="skill.skill_name",       read_only=True, default=None)
    skill_level_name = serializers.CharField(source="skill_level.level_name", read_only=True, default=None)
    created_by_name  = serializers.SerializerMethodField()

    class Meta:
        model = QuestionBank
        fields = [
            "id", "question_text", "question_type", "scenario_text",
            "explanation_text", "difficulty_complexity",
            "skill", "skill_name", "skill_level", "skill_level_name",
            "is_active", "created_by_name", "created_at", "options",
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        try:
            p = obj.created_by.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.created_by.user.username
        except Exception:
            return None
