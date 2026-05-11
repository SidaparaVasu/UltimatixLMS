import random
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from common.services.base import BaseService
from .repositories import (
    AssessmentRepository, AttemptRepository, 
    QuestionRepository, ResultRepository
)
from .models import AssessmentAttempt, AssessmentQuestionMapping


class AssessmentBuildService(BaseService):
    """
    Handles Studio-level operations for building quizzes.
    """
    repository_class = AssessmentRepository

    @transaction.atomic
    def bulk_sync_questions(self, assessment_id, question_data_list):
        """
        Syncs the curriculum of an assessment. 
        Accepts a list of question IDs and weights.
        """
        # Remove old mappings
        AssessmentQuestionMapping.objects.filter(assessment_id=assessment_id).delete()
        
        mappings = []
        for i, data in enumerate(question_data_list):
            mappings.append(AssessmentQuestionMapping(
                assessment_id=assessment_id,
                question_id=data['question_id'],
                weight_points=data.get('weight', 1.00),
                display_order=i + 1
            ))
        
        return AssessmentQuestionMapping.objects.bulk_create(mappings)


class AttemptService(BaseService):
    """
    Handles Learner-level operations for taking exams in a strictly linear flow.
    """
    repository_class = AttemptRepository

    @transaction.atomic
    def start_attempt(self, employee_id, assessment_id):
        """
        Initializes a new attempt and pre-populates the question shells.

        For FIXED assessments (course quizzes): reads pre-mapped questions.
        For DYNAMIC assessments (standalone): runs DynamicQuestionSelector,
        writes per-attempt question mappings, and enforces cooldown.
        """
        from .constants import QuestionSelectionMode
        from .question_selector import DynamicQuestionSelector, InsufficientQuestionsError

        assessment = AssessmentRepository().get_by_id(assessment_id)
        if not assessment:
            raise ValueError("Assessment not found.")

        # 1. Check for active attempt
        active = self.repository.get_active_attempt(employee_id, assessment_id)
        if active:
            return active

        # 2. Check retake limit — base limit + any admin-granted extra attempts
        history_count = self.repository.filter(
            employee_id=employee_id,
            assessment_id=assessment_id
        ).count()

        from .repositories import RetakeGrantRepository
        extra_grants = RetakeGrantRepository().count_grants(employee_id, assessment_id)
        effective_limit = assessment.retake_limit + extra_grants

        if history_count >= effective_limit:
            raise ValueError(
                f"Retake limit reached. Maximum {effective_limit} attempt(s) allowed."
            )

        # 3. Cooldown check (DYNAMIC mode only, applies after a FAILED attempt)
        if (
            assessment.question_selection_mode == QuestionSelectionMode.DYNAMIC
            and assessment.retake_cooldown_hours > 0
            and history_count > 0
        ):
            from .models import AssessmentResult
            last_attempt = (
                self.repository.filter(
                    employee_id=employee_id,
                    assessment_id=assessment_id,
                    status="COMPLETED",
                )
                .order_by("-started_at")
                .first()
            )
            if last_attempt:
                try:
                    last_result = last_attempt.result
                    if last_result.status == "FAIL" and last_attempt.submitted_at:
                        cooldown_ends = last_attempt.submitted_at + timedelta(
                            hours=assessment.retake_cooldown_hours
                        )
                        now = timezone.now()
                        if now < cooldown_ends:
                            remaining = cooldown_ends - now
                            hours_left = int(remaining.total_seconds() / 3600) + 1
                            raise ValueError(
                                f"Cooldown active. You can retake this assessment in "
                                f"{hours_left} hour(s)."
                            )
                except AssessmentResult.DoesNotExist:
                    pass

        # 4. Create attempt
        expires_at = timezone.now() + timedelta(minutes=assessment.duration_minutes)
        attempt = self.repository.create(**{
            "employee_id": employee_id,
            "assessment_id": assessment_id,
            "status": "IN_PROGRESS",
            "expires_at": expires_at
        })

        # 5. Select questions and create UserAnswer shells
        if assessment.question_selection_mode == QuestionSelectionMode.DYNAMIC:
            # Dynamic: algorithm selects questions from the bank
            selector = DynamicQuestionSelector()
            try:
                questions = selector.select(
                    assessment=assessment,
                    employee_id=employee_id,
                    number_of_questions=assessment.number_of_questions,
                )
            except InsufficientQuestionsError as e:
                # Roll back the attempt creation and surface the error
                attempt.delete()
                raise ValueError(str(e))

            # Write per-attempt question mappings
            mappings = AssessmentQuestionMapping.objects.bulk_create([
                AssessmentQuestionMapping(
                    assessment=assessment,
                    attempt=attempt,
                    question=q,
                    weight_points=1.00,
                    time_limit_seconds=0,
                    display_order=i + 1,
                )
                for i, q in enumerate(questions)
            ])

            if assessment.is_randomized:
                random.shuffle(questions)

            from .models import UserAnswer
            UserAnswer.objects.bulk_create([
                UserAnswer(attempt=attempt, question=q, status="NOT_VISITED")
                for q in questions
            ])

        else:
            # Fixed: read pre-mapped questions (existing course quiz behavior)
            mappings = list(
                assessment.question_mappings.filter(attempt__isnull=True)
            )
            if assessment.is_randomized:
                random.shuffle(mappings)

            from .models import UserAnswer
            UserAnswer.objects.bulk_create([
                UserAnswer(attempt=attempt, question_id=m.question_id, status="NOT_VISITED")
                for m in mappings
            ])

        return attempt

    @transaction.atomic
    def get_next_question(self, attempt_id):
        """
        Atomically identifies the next not-visited question and starts its timer.
        """
        from .models import UserAnswer
        next_answer = UserAnswer.objects.filter(
            attempt_id=attempt_id, 
            status="NOT_VISITED"
        ).order_by('id').first()
        
        if not next_answer:
            return None

        next_answer.started_at = timezone.now()
        next_answer.save()
        return next_answer

    @transaction.atomic
    def submit_question_answer(self, attempt_id, question_id, selected_option_ids=None, answer_text="", file_ref=None):
        """
        Submits answer for a specific question with Hard-Timing enforcement.
        """
        from .models import UserAnswer
        answer = UserAnswer.objects.get(attempt_id=attempt_id, question_id=question_id)
        
        if answer.status != "NOT_VISITED" or not answer.started_at:
            raise ValueError("Question already submitted or timer not started.")

        # Fetch the mapping — check attempt-specific first (DYNAMIC), then global (FIXED)
        mapping = (
            AssessmentQuestionMapping.objects.filter(
                attempt_id=attempt_id,
                question_id=question_id,
            ).first()
            or
            AssessmentQuestionMapping.objects.filter(
                assessment_id=answer.attempt.assessment_id,
                question_id=question_id,
                attempt__isnull=True,
            ).first()
        )

        if mapping and mapping.time_limit_seconds > 0:
            duration = (timezone.now() - answer.started_at).total_seconds()
            # 5s buffer for network latency
            if duration > (mapping.time_limit_seconds + 5):
                answer.status = "TIMED_OUT"
                answer.finished_at = timezone.now()
                answer.save()
                return answer, False

        # Save response
        if selected_option_ids:
            answer.selected_options.set(selected_option_ids)
        
        answer.answer_text = answer_text
        answer.uploaded_file = file_ref
        answer.status = "ATTEMPTED"
        answer.finished_at = timezone.now()
        answer.save()
        
        return answer, True


class GradingService(BaseService):
    """
    Core Evaluation Engine for Assessments.
    """
    repository_class = ResultRepository

    @transaction.atomic
    def grade_attempt(self, attempt_id):
        """
        Orchestrates the final scoring once the attempt is complete.
        """
        attempt = AttemptRepository().get_by_id(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found.")
            
        if attempt.status == "COMPLETED":
            return attempt.result

        assessment = attempt.assessment
        # For DYNAMIC attempts, mappings are per-attempt; for FIXED, they're global
        if assessment.question_selection_mode == "DYNAMIC":
            mappings = {m.question_id: m for m in AssessmentQuestionMapping.objects.filter(attempt=attempt)}
        else:
            mappings = {m.question_id: m for m in assessment.question_mappings.filter(attempt__isnull=True)}
        # We only grade Attempted questions; Timed-out/Not-visited are 0 by default
        answers = attempt.answers.all().select_related('question')
        
        total_possible_points = sum(m.weight_points for m in mappings.values())
        earned_points = 0
        needs_manual_review = False

        for answer in answers:
            mapping = mappings.get(answer.question_id)
            if not mapping or answer.status != "ATTEMPTED":
                continue
                
            q_type = answer.question.question_type

            # 1. Handle Auto-gradable types
            # SCENARIO questions with options are auto-graded like MCQ/MSQ.
            # Only SCENARIO without options (free-text answer) needs manual review.
            has_options = answer.question.options.filter(is_correct=True).exists()

            if q_type in ["MCQ", "MSQ", "TRUE_FALSE"] or (q_type == "SCENARIO" and has_options):
                q_score = self.calculate_objective_score(answer, mapping, assessment)
                answer.earned_points = q_score
                answer.is_auto_graded = True
                answer.save()
                earned_points += q_score
            else:
                # DESCRIPTIVE, FILE_UPLOAD, or SCENARIO without options
                needs_manual_review = True
                answer.is_auto_graded = False
                answer.save()

        # Final floor for negative scores (Never go below 0% for the final result)
        earned_points = max(0, earned_points)

        # 2. Finalize Result
        score_percentage = (earned_points / total_possible_points * 100) if total_possible_points > 0 else 0
        
        status = "PENDING" if needs_manual_review else ("PASS" if score_percentage >= assessment.passing_percentage else "FAIL")
        
        result = self.repository.create(**{
            "attempt": attempt,
            "total_score": earned_points,
            "score_percentage": score_percentage,
            "status": status,
            "grading_type": "PENDING" if needs_manual_review else "AUTO_GRADED",
            "graded_at": timezone.now() if not needs_manual_review else None
        })

        # 3. Mark attempt as completed
        attempt.status = "COMPLETED"
        attempt.submitted_at = timezone.now()
        attempt.save()

        # 4. For standalone DYNAMIC assessments that passed, create skill upgrade proposals
        from .constants import QuestionSelectionMode
        if (
            assessment.question_selection_mode == QuestionSelectionMode.DYNAMIC
            and result.status == "PASS"
        ):
            self._create_skill_upgrade_proposals(attempt, result)

        return result

    def _create_skill_upgrade_proposals(self, attempt, result):
        """
        Creates one SkillUpgradeProposal per skill mapped to the assessment.
        Skips skills where the employee already holds an equal or higher level.
        Notifies users with SKILL_UPGRADE_APPROVE permission.
        """
        try:
            from .models import AssessmentSkillMapping, SkillUpgradeProposal
            from apps.skill_management.models import EmployeeSkill
            from apps.notifications.models import Notification
            from apps.notifications.constants import NotificationType
            from apps.rbac.models import UserRoleMaster, RolePermissionMaster, PermissionMaster

            skill_mappings = AssessmentSkillMapping.objects.filter(
                assessment=attempt.assessment
            ).select_related("skill", "skill_level")

            proposals_created = []

            for sm in skill_mappings:
                # Check if employee already has an equal or higher level for this skill
                existing = EmployeeSkill.objects.filter(
                    employee=attempt.employee,
                    skill=sm.skill,
                    is_active=True,
                ).select_related("current_level").first()

                if existing and existing.current_level.level_rank >= sm.skill_level.level_rank:
                    # Already at or above the proposed level — skip
                    continue

                # Avoid duplicate pending proposals for the same employee+skill
                already_pending = SkillUpgradeProposal.objects.filter(
                    employee=attempt.employee,
                    skill=sm.skill,
                    status="PENDING",
                ).exists()
                if already_pending:
                    continue

                proposal = SkillUpgradeProposal.objects.create(
                    employee=attempt.employee,
                    assessment_attempt=attempt,
                    skill=sm.skill,
                    proposed_level=sm.skill_level,
                    status="PENDING",
                )
                proposals_created.append(proposal)

            if not proposals_created:
                return

            # Notify all users with SKILL_UPGRADE_APPROVE permission
            try:
                perm = PermissionMaster.objects.get(permission_code="SKILL_UPGRADE_APPROVE")
                approver_user_ids = (
                    UserRoleMaster.objects.filter(
                        role__rolepermissionmaster__permission=perm,
                        is_active=True,
                    )
                    .values_list("user_id", flat=True)
                    .distinct()
                )

                skill_names = ", ".join(p.skill.skill_name for p in proposals_created)
                learner_name = attempt.employee.user.profile.first_name or attempt.employee.employee_code

                for user_id in approver_user_ids:
                    Notification.objects.create(
                        user_id=user_id,
                        notification_type=NotificationType.SKILL_UPGRADE,
                        title="Skill upgrade approval required",
                        message=(
                            f"{learner_name} passed \"{attempt.assessment.title}\" "
                            f"and has a pending skill upgrade for: {skill_names}."
                        ),
                        action_url="/admin/assessments/skill-upgrades",
                        entity_type="SkillUpgradeProposal",
                        entity_id=str(proposals_created[0].id),
                    )
            except Exception:
                pass  # notification failure must never break grading

        except Exception:
            pass  # proposal creation failure must never break grading

    def calculate_objective_score(self, answer, mapping, assessment):
        """
        Scoring logic supporting MSQ (partial credit) and Negative Marking.

        MSQ scoring (no global negative marking):
          - Each correct option selected   → +weight / total_correct
          - Each wrong option selected     → -weight / total_correct  (per-option deduction)
          - Result is floored at 0 so a single question never goes negative
          - Perfect match still awards full weight

        MCQ / TRUE_FALSE:
          - Perfect match → full weight
          - Any mismatch  → 0 (or global negative-marking penalty)

        Global negative marking (neg_enabled):
          - Overrides MSQ partial logic — flat penalty on any wrong answer
        """
        from decimal import Decimal
        weight = Decimal(str(mapping.weight_points))
        neg_enabled = assessment.negative_marking_enabled
        neg_perc = Decimal(str(assessment.negative_marking_percentage))

        question = answer.question
        correct_options = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        selected_options = set(answer.selected_options.values_list('id', flat=True))

        # 1. Perfect match — full marks for all question types
        if selected_options == correct_options and len(correct_options) > 0:
            return weight

        # 2. Nothing selected — 0 points
        if not selected_options:
            return Decimal("0.00")

        # 3. MSQ partial credit (when global negative marking is off)
        if question.question_type == "MSQ" and not neg_enabled:
            total_correct = Decimal(len(correct_options))
            per_option_value = weight / total_correct

            correct_selected = selected_options & correct_options
            wrong_selected   = selected_options - correct_options

            raw_score = (
                Decimal(len(correct_selected)) * per_option_value
                - Decimal(len(wrong_selected)) * per_option_value
            )
            # Floor at 0 — a single question never contributes negative points
            return max(Decimal("0.00"), raw_score)

        # 4. MCQ / TRUE_FALSE mismatch, or MSQ with global negative marking enabled
        if neg_enabled:
            # Flat penalty for any wrong answer
            penalty = -(weight * (neg_perc / Decimal("100.00")))
            return penalty

        return Decimal("0.00")


class ReviewService:
    """
    Handles instructor manual grading and retake grant operations.
    """

    @transaction.atomic
    def submit_manual_grades(
        self,
        attempt_id: str,
        grades: list,
        instructor_feedback: str,
        graded_by_employee,
    ):
        """
        Applies manual scores to pending answers, recalculates the final result,
        marks the quiz lesson complete (Option 3 — fail doesn't block progress),
        and sends a notification to the learner.

        grades: list of dicts with keys 'answer_id' and 'earned_points'
        """
        from decimal import Decimal
        from django.utils import timezone
        from .models import UserAnswer, AssessmentResult, AssessmentQuestionMapping

        attempt = AttemptRepository().get_by_id(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found.")
        if attempt.status != "COMPLETED":
            raise ValueError("Attempt is not yet completed.")

        # 1. Apply manual scores to each pending answer
        answer_map = {str(a.id): a for a in attempt.answers.all()}
        for grade in grades:
            answer = answer_map.get(str(grade['answer_id']))
            if not answer:
                continue
            if answer.is_auto_graded:
                continue  # never override auto-graded answers
            answer.earned_points = Decimal(str(grade['earned_points']))
            answer.is_auto_graded = False  # stays False — manually graded
            answer.save(update_fields=['earned_points'])

        # Recalculate total score using the correct mapping set
        all_answers = attempt.answers.all()
        total_earned = sum(a.earned_points for a in all_answers)
        total_earned = max(Decimal("0.00"), total_earned)

        if attempt.assessment.question_selection_mode == "DYNAMIC":
            mappings_qs = AssessmentQuestionMapping.objects.filter(attempt=attempt)
        else:
            mappings_qs = AssessmentQuestionMapping.objects.filter(
                assessment=attempt.assessment, attempt__isnull=True
            )
        mappings_total = sum(m.weight_points for m in mappings_qs)
        score_pct = (total_earned / mappings_total * 100) if mappings_total > 0 else Decimal("0.00")

        passing = attempt.assessment.passing_percentage
        result_status = "PASS" if score_pct >= passing else "FAIL"

        # 3. Update or create the result record
        result, _ = AssessmentResult.objects.update_or_create(
            attempt=attempt,
            defaults={
                "total_score":          total_earned,
                "score_percentage":     score_pct,
                "status":               result_status,
                "grading_type":         "MANUALLY_GRADED",
                "instructor_feedback":  instructor_feedback,
                "graded_by":            graded_by_employee,
                "graded_at":            timezone.now(),
            },
        )

        # 4. Mark quiz lesson complete regardless of pass/fail (Option 3)
        self._mark_lesson_complete(attempt)

        # 5. Send notification to learner
        self._notify_learner(attempt, result)

        # 6. For standalone DYNAMIC assessments that passed, create skill upgrade proposals
        from .constants import QuestionSelectionMode
        if (
            attempt.assessment.question_selection_mode == QuestionSelectionMode.DYNAMIC
            and result.status == "PASS"
        ):
            GradingService()._create_skill_upgrade_proposals(attempt, result)

        return result

    def _mark_lesson_complete(self, attempt):
        """
        Marks the quiz lesson as complete in the learner's enrollment progress.
        Called after manual grading — pass or fail, progress is never blocked.
        """
        from apps.learning_progress.models import (
            UserCourseEnrollment, UserLessonProgress, UserContentProgress
        )
        from apps.learning_progress.constants import ProgressStatus
        from django.utils import timezone

        lesson = attempt.assessment.lesson
        if not lesson:
            return  # standalone assessment — no lesson to mark

        # Find the enrollment for this employee + course
        course = attempt.assessment.course
        if not course:
            return

        enrollment = UserCourseEnrollment.objects.filter(
            employee=attempt.employee,
            course=course,
        ).first()
        if not enrollment:
            return

        # Find or create lesson progress
        lesson_progress, _ = UserLessonProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson,
            defaults={"status": ProgressStatus.IN_PROGRESS},
        )

        if lesson_progress.status == ProgressStatus.COMPLETED:
            return  # already done

        lesson_progress.status = ProgressStatus.COMPLETED
        lesson_progress.completed_at = timezone.now()
        lesson_progress.save(update_fields=["status", "completed_at"])

        # Recalculate overall course progress
        from apps.learning_progress.services import UserCourseEnrollmentService
        UserCourseEnrollmentService().update_course_progress(enrollment.id)

    def _notify_learner(self, attempt, result):
        """
        Sends an in-app notification to the learner with their result.
        """
        try:
            from apps.notifications.models import Notification
            from apps.notifications.constants import NotificationType
            score_pct = float(result.score_percentage)
            passed = result.status == "PASS"
            status_label = "Passed ✓" if passed else "Failed ✗"

            # Build deep-link: find the enrollment to construct /learn/:enrollmentId
            from apps.learning_progress.models import UserCourseEnrollment
            enrollment = UserCourseEnrollment.objects.filter(
                employee=attempt.employee,
                course=attempt.assessment.course,
            ).first()
            deep_link = f"/learn/{enrollment.id}" if enrollment else ""

            if passed:
                body = (
                    f"Your submission for \"{attempt.assessment.title}\" has been reviewed. "
                    f"You scored {score_pct:.1f}% — {status_label}. "
                    f"Congratulations on passing!"
                )
            else:
                body = (
                    f"Your submission for \"{attempt.assessment.title}\" has been reviewed. "
                    f"You scored {score_pct:.1f}% — {status_label}. "
                    f"Please contact your instructor if you need a retake."
                )

            Notification.objects.create(
                user=attempt.employee.user,
                notification_type=NotificationType.ASSESSMENT_RESULT,
                title="Assessment result available",
                message=body,
                action_url=deep_link,
                entity_type="AssessmentAttempt",
                entity_id=str(attempt.id),
            )
        except Exception:
            # Notification failure must never break the grading transaction
            pass

    def grant_retake(
        self,
        attempt_id: str,
        granted_by_employee,
        note: str = "",
    ):
        """
        Issues one additional retake grant for the employee+assessment
        associated with the given attempt.
        """
        from .repositories import RetakeGrantRepository

        attempt = AttemptRepository().get_by_id(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found.")

        grant = RetakeGrantRepository().create_grant(
            assessment_id=attempt.assessment_id,
            employee_id=attempt.employee_id,
            granted_by_id=granted_by_employee.id if granted_by_employee else None,
            note=note,
        )
        return grant
