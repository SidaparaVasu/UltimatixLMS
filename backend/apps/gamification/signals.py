"""
Gamification signal receivers.

Dependency direction:
    gamification → (learning_progress, assessment_engine, certificate_management)
    Source apps do not import gamification.

Receivers are wrapped in try/except so award logic never breaks the triggering save.
"""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _engine():
    from apps.gamification.services.award_engine import AwardEngine
    return AwardEngine()


def _streaks():
    from apps.gamification.services.streak_service import StreakService
    return StreakService()


def _badges():
    from apps.gamification.services.badge_evaluator import BadgeEvaluator
    return BadgeEvaluator()


# ---------------------------------------------------------------------------
# UserCourseEnrollment — XP when status transitions to COMPLETED
# ---------------------------------------------------------------------------

from apps.learning_progress.models import UserCourseEnrollment  # noqa: E402


@receiver(pre_save, sender=UserCourseEnrollment)
def _capture_enrollment_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._gamification_old_status = (
                UserCourseEnrollment.objects
                .values_list("status", flat=True)
                .get(pk=instance.pk)
            )
        except UserCourseEnrollment.DoesNotExist:
            instance._gamification_old_status = None
    else:
        instance._gamification_old_status = None


@receiver(post_save, sender=UserCourseEnrollment)
def on_enrollment_saved_award_points(sender, instance, created, **kwargs):
    if created:
        return
    try:
        old_status = getattr(instance, "_gamification_old_status", None)
        if old_status != "COMPLETED" and instance.status == "COMPLETED":
            from apps.learning_progress.constants import ProgressStatus

            badge_context = {}
            if old_status == ProgressStatus.OVERDUE:
                badge_context["overdue_recovery"] = True
            _engine().award_course_completed(instance, badge_context=badge_context)
            _badges().evaluate_for_employee(instance.employee)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_enrollment_saved_award_points failed: "
            "enrollment_id=%s error=%s",
            instance.pk,
            exc,
        )


# ---------------------------------------------------------------------------
# AssessmentResult — XP on PASS (including manual grading updates)
# ---------------------------------------------------------------------------

from apps.assessment_engine.models import AssessmentResult  # noqa: E402


@receiver(pre_save, sender=AssessmentResult)
def _capture_result_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._gamification_old_status = (
                AssessmentResult.objects
                .values_list("status", flat=True)
                .get(pk=instance.pk)
            )
        except AssessmentResult.DoesNotExist:
            instance._gamification_old_status = None
    else:
        instance._gamification_old_status = None


@receiver(post_save, sender=AssessmentResult)
def on_assessment_result_saved_award_points(sender, instance, created, **kwargs):
    try:
        from django.utils import timezone
        from apps.gamification.constants import StreakType

        old_status = getattr(instance, "_gamification_old_status", None)
        employee = instance.attempt.employee
        streak_svc = _streaks()
        activity_date = timezone.localdate()

        if instance.status == "FAIL":
            streak_svc.reset_pass_consecutive(employee)
            return

        if instance.status != "PASS":
            return

        if created or old_status != "PASS":
            prior_submitted = AssessmentAttempt.objects.filter(
                employee_id=employee.id,
                assessment_id=instance.attempt.assessment_id,
                submitted_at__isnull=False,
            ).exclude(pk=instance.attempt_id).count()
            badge_context = {"first_try_pass": prior_submitted == 0}
            _engine().award_assessment_passed(instance, badge_context=badge_context)
            streak_svc.record_calendar_streak(employee, StreakType.PASS_DAILY, activity_date)
            streak_svc.increment_pass_consecutive(employee)
            _badges().evaluate_for_employee(employee)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_assessment_result_saved_award_points failed: "
            "result_id=%s error=%s",
            instance.pk,
            exc,
        )


# ---------------------------------------------------------------------------
# AssessmentAttempt — daily attempt streak when submitted
# ---------------------------------------------------------------------------

from apps.assessment_engine.models import AssessmentAttempt  # noqa: E402


@receiver(pre_save, sender=AssessmentAttempt)
def _capture_attempt_submitted(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._gamification_had_submitted = bool(
                AssessmentAttempt.objects.filter(pk=instance.pk)
                .values_list("submitted_at", flat=True)
                .get()
            )
        except AssessmentAttempt.DoesNotExist:
            instance._gamification_had_submitted = False
    else:
        instance._gamification_had_submitted = False


@receiver(post_save, sender=AssessmentAttempt)
def on_attempt_submitted_streak(sender, instance, created, **kwargs):
    try:
        from django.utils import timezone
        from apps.gamification.constants import StreakType

        if not instance.submitted_at:
            return
        had_submitted = getattr(instance, "_gamification_had_submitted", False)
        if not created and had_submitted:
            return
        _streaks().record_calendar_streak(
            instance.employee,
            StreakType.ATTEMPT_DAILY,
            timezone.localdate(),
        )
        _badges().evaluate_for_employee(instance.employee)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_attempt_submitted_streak failed: attempt_id=%s error=%s",
            instance.pk,
            exc,
        )


# ---------------------------------------------------------------------------
# UserContentProgress — learning streak from qualified daily engagement
# ---------------------------------------------------------------------------

from apps.learning_progress.models import UserContentProgress  # noqa: E402


@receiver(post_save, sender=UserContentProgress)
def on_content_progress_learning_streak(sender, instance, **kwargs):
    try:
        employee = instance.lesson_progress.enrollment.employee
        if _streaks().try_record_learning_day(employee):
            _badges().evaluate_for_employee(employee)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_content_progress_learning_streak failed: "
            "content_progress_id=%s error=%s",
            instance.pk,
            exc,
        )


# ---------------------------------------------------------------------------
# SkillUpgradeProposal — XP when status transitions to APPROVED
# ---------------------------------------------------------------------------

from apps.assessment_engine.models import SkillUpgradeProposal  # noqa: E402


@receiver(pre_save, sender=SkillUpgradeProposal)
def _capture_proposal_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._gamification_old_status = (
                SkillUpgradeProposal.objects
                .values_list("status", flat=True)
                .get(pk=instance.pk)
            )
        except SkillUpgradeProposal.DoesNotExist:
            instance._gamification_old_status = None
    else:
        instance._gamification_old_status = None


@receiver(post_save, sender=SkillUpgradeProposal)
def on_skill_upgrade_saved_award_points(sender, instance, created, **kwargs):
    try:
        old_status = getattr(instance, "_gamification_old_status", None)
        if instance.status == "APPROVED" and old_status != "APPROVED":
            _engine().award_skill_upgrade_approved(instance)
            _badges().evaluate_for_employee(instance.employee)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_skill_upgrade_saved_award_points failed: "
            "proposal_id=%s error=%s",
            instance.pk,
            exc,
        )


# ---------------------------------------------------------------------------
# IssuedCertificate — XP when a new certificate row is created
# ---------------------------------------------------------------------------

from apps.certificate_management.models import IssuedCertificate  # noqa: E402


@receiver(post_save, sender=IssuedCertificate)
def on_certificate_issued_award_points(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        _engine().award_certificate_issued(instance)
        _badges().evaluate_for_employee(instance.employee)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_certificate_issued_award_points failed: "
            "certificate_id=%s error=%s",
            instance.pk,
            exc,
        )
