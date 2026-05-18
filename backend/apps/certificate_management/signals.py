"""
Certificate Management signals.

Auto-issuance triggers:

    UserCourseEnrollment  post_save  → status == 'COMPLETED'
        → CertificateIssuanceService.issue_for_course_completion(enrollment.id)

    AssessmentResult      post_save  → status == 'PASS'
        → CertificateIssuanceService.issue_for_assessment_pass(result.attempt_id)

Both handlers are:
    - Idempotent: the service checks for an existing certificate before creating one.
    - Non-blocking: exceptions are caught and logged; they never propagate to the
      caller that triggered the save (e.g. the grading engine or progress tracker).
    - Lazy-imported: model imports are deferred inside the handler body to avoid
      circular import issues at app startup.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Course completion → issue certificate
# ---------------------------------------------------------------------------

@receiver(post_save, sender="learning_progress.UserCourseEnrollment")
def on_course_completed(sender, instance, **kwargs):
    """
    Fires after every UserCourseEnrollment save.

    Only proceeds when status has just been set to COMPLETED.
    Uses `created` and the current status value — does not compare to the
    previous value, so it relies on the service's idempotency guard to
    prevent duplicate certificates if the enrollment is saved multiple times
    with COMPLETED status.
    """
    if instance.status != "COMPLETED":
        return

    try:
        from .services import CertificateIssuanceService
        CertificateIssuanceService().issue_for_course_completion(instance.id)
    except Exception as exc:
        logger.exception(
            "on_course_completed: unhandled error while issuing certificate "
            "for enrollment %s: %s",
            instance.id,
            exc,
        )


# ---------------------------------------------------------------------------
# Assessment pass → issue certificate
# ---------------------------------------------------------------------------

@receiver(post_save, sender="assessment_engine.AssessmentResult")
def on_assessment_passed(sender, instance, **kwargs):
    """
    Fires after every AssessmentResult save.

    Only proceeds when:
      - status == 'PASS'
      - The assessment is standalone (course_id is None and lesson_id is None)

    Course-linked assessments (quizzes) do NOT generate certificates — only
    standalone assessments do. The course completion certificate is issued
    separately via on_course_completed when the enrollment reaches COMPLETED.

    The service's idempotency guard prevents duplicate certificates if the
    result is saved multiple times (e.g. during manual grading).
    """
    if instance.status != "PASS":
        return

    # Guard: only standalone assessments get certificates
    try:
        assessment = instance.attempt.assessment
        if assessment.course_id is not None or assessment.lesson_id is not None:
            logger.debug(
                "on_assessment_passed: skipping certificate for course-linked "
                "assessment %s (attempt %s)",
                assessment.id,
                instance.attempt_id,
            )
            return
    except Exception as exc:
        logger.warning(
            "on_assessment_passed: could not load assessment for attempt %s: %s",
            instance.attempt_id,
            exc,
        )
        return

    try:
        from .services import CertificateIssuanceService
        CertificateIssuanceService().issue_for_assessment_pass(instance.attempt_id)
    except Exception as exc:
        logger.exception(
            "on_assessment_passed: unhandled error while issuing certificate "
            "for attempt %s: %s",
            instance.attempt_id,
            exc,
        )
