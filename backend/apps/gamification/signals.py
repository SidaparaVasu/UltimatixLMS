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
            _engine().award_course_completed(instance)
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
        if instance.status != "PASS":
            return
        old_status = getattr(instance, "_gamification_old_status", None)
        if created or old_status != "PASS":
            _engine().award_assessment_passed(instance)
    except Exception as exc:
        logger.error(
            "gamification.signals.on_assessment_result_saved_award_points failed: "
            "result_id=%s error=%s",
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
    except Exception as exc:
        logger.error(
            "gamification.signals.on_certificate_issued_award_points failed: "
            "certificate_id=%s error=%s",
            instance.pk,
            exc,
        )
