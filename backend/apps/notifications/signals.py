"""
Notification signals.

All post_save / pre_save receivers that auto-create Notification records live here.
Receivers are registered when NotificationsConfig.ready() imports this module.

Dependency direction rule:
    notifications → (learning_progress, tni_management, training_planning,
                     assessment_engine, skill_management)

    The source apps (learning_progress, etc.) know NOTHING about notifications.
    Only this module imports from them — never the reverse.

Signal safety rules:
    - Every receiver is wrapped in a try/except so a notification bug can NEVER
      break the core operation that triggered the save.
    - Receivers only fire on the specific state transitions they care about
      (e.g. status change to COMPLETED, not every save).
    - Pre-save receivers stash old state on the instance so post-save can diff.
    - No receiver performs additional DB writes other than calling the service.
"""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lazy service accessor — avoids import at module load time (AppRegistry not
# ready yet when signals.py is first imported inside ready()).
# ---------------------------------------------------------------------------

def _svc():
    from apps.notifications.services.notification_service import NotificationService
    return NotificationService()


# ---------------------------------------------------------------------------
# Helper: resolve AuthUser.id from an EmployeeMaster instance.
# Returns None if the employee has no linked user account.
# ---------------------------------------------------------------------------

def _user_id(employee) -> int | None:
    if employee and employee.user_id:
        return employee.user_id
    return None


# ---------------------------------------------------------------------------
# Helper: resolve the direct manager's AuthUser.id for an employee.
# Returns None if no DIRECT manager is configured.
# ---------------------------------------------------------------------------

def _manager_user_id(employee) -> int | None:
    try:
        from apps.org_management.models import EmployeeReportingManager
        rel = (
            EmployeeReportingManager.objects
            .select_related("manager__user")
            .filter(employee=employee, relationship_type="DIRECT")
            .first()
        )
        if rel and rel.manager and rel.manager.user_id:
            return rel.manager.user_id
    except Exception:
        pass
    return None


# ===========================================================================
# 1. UserCourseEnrollment
#    Triggers: ENROLLMENT (on create), COMPLETION (on status → COMPLETED)
# ===========================================================================

from apps.learning_progress.models import UserCourseEnrollment  # noqa: E402


@receiver(pre_save, sender=UserCourseEnrollment)
def _capture_enrollment_old_status(sender, instance, **kwargs):
    """
    Stash the previous status on the instance before the row is updated.
    Used by the post_save receiver to detect COMPLETED transitions.
    """
    if instance.pk:
        try:
            instance._old_status = (
                UserCourseEnrollment.objects
                .values_list("status", flat=True)
                .get(pk=instance.pk)
            )
        except UserCourseEnrollment.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=UserCourseEnrollment)
def on_enrollment_saved(sender, instance, created, **kwargs):
    """
    ENROLLMENT  — fires once when a new enrollment row is created.
    COMPLETION  — fires when status transitions to COMPLETED.
    TEAM_COMPLETION — notifies the direct manager when their report completes.
    """
    try:
        uid = _user_id(instance.employee)
        if not uid:
            return

        svc = _svc()

        if created:
            # ── ENROLLMENT notification ──────────────────────────────────
            svc.notify_enrollment(
                user_id=uid,
                course_title=instance.course.course_title,
                course_id=instance.course_id,
                enrollment_id=instance.pk,
            )

        else:
            old_status = getattr(instance, "_old_status", None)
            if old_status != "COMPLETED" and instance.status == "COMPLETED":
                # ── COMPLETION notification ──────────────────────────────
                svc.notify_course_completed(
                    user_id=uid,
                    course_title=instance.course.course_title,
                    enrollment_id=instance.pk,
                )

                # ── TEAM_COMPLETION → notify direct manager ───────────────
                manager_uid = _manager_user_id(instance.employee)
                if manager_uid:
                    try:
                        employee_name = instance.employee.user_label()
                    except Exception:
                        employee_name = instance.employee.employee_code

                    svc.notify_team_completion(
                        manager_user_id=manager_uid,
                        employee_name=employee_name,
                        course_title=instance.course.course_title,
                        enrollment_id=instance.pk,
                    )

    except Exception as exc:
        logger.error(
            "notifications.signals.on_enrollment_saved failed: enrollment_id=%s error=%s",
            instance.pk, exc,
        )


# ===========================================================================
# 2. CourseCertificate
#    Trigger: CERTIFICATE (on create)
# ===========================================================================

from apps.learning_progress.models import CourseCertificate  # noqa: E402


@receiver(post_save, sender=CourseCertificate)
def on_certificate_created(sender, instance, created, **kwargs):
    """
    CERTIFICATE — fires once when a certificate record is first created.
    """
    if not created:
        return
    try:
        enrollment = instance.enrollment
        uid = _user_id(enrollment.employee)
        if not uid:
            return

        _svc().notify_certificate_issued(
            user_id=uid,
            course_title=enrollment.course.course_title,
            certificate_id=instance.pk,
        )
    except Exception as exc:
        logger.error(
            "notifications.signals.on_certificate_created failed: cert_id=%s error=%s",
            instance.pk, exc,
        )


# ===========================================================================
# 3. AssessmentResult
#    Trigger: ASSESSMENT_RESULT (on create — result is written once after grading)
# ===========================================================================

from apps.assessment_engine.models import AssessmentResult  # noqa: E402


@receiver(post_save, sender=AssessmentResult)
def on_assessment_result_created(sender, instance, created, **kwargs):
    """
    ASSESSMENT_RESULT — fires once when the graded result row is first created.
    """
    if not created:
        return
    try:
        attempt = instance.attempt
        uid = _user_id(attempt.employee)
        if not uid:
            return

        # Resolve the enrollment_id for the action_url (/learn/:enrollmentId).
        # The attempt links to an assessment which links to a course; find the
        # matching enrollment for this employee + course.
        from apps.learning_progress.models import UserCourseEnrollment
        enrollment = (
            UserCourseEnrollment.objects
            .filter(
                employee=attempt.employee,
                course=attempt.assessment.course,
            )
            .order_by("-enrolled_at")
            .first()
        )
        enrollment_id = enrollment.pk if enrollment else 0

        _svc().notify_assessment_result(
            user_id=uid,
            assessment_title=attempt.assessment.title,
            score=float(instance.score_percentage),
            enrollment_id=enrollment_id,
        )
    except Exception as exc:
        logger.error(
            "notifications.signals.on_assessment_result_created failed: result_id=%s error=%s",
            instance.pk, exc,
        )


# ===========================================================================
# 4. TrainingNeedApproval
#    Triggers:
#      TNI_PENDING_REVIEW  — on create (status=PENDING) → notify manager/approver
#      TNI_APPROVAL        — on update status → APPROVED → notify employee
#      TNI_REJECTION       — on update status → REJECTED → notify employee
# ===========================================================================

from apps.tni_management.models import TrainingNeedApproval  # noqa: E402
from apps.tni_management.constants import TNIApprovalStatus  # noqa: E402


@receiver(pre_save, sender=TrainingNeedApproval)
def _capture_tni_approval_old_status(sender, instance, **kwargs):
    """Stash previous approval_status before update."""
    if instance.pk:
        try:
            instance._old_approval_status = (
                TrainingNeedApproval.objects
                .values_list("approval_status", flat=True)
                .get(pk=instance.pk)
            )
        except TrainingNeedApproval.DoesNotExist:
            instance._old_approval_status = None
    else:
        instance._old_approval_status = None


@receiver(post_save, sender=TrainingNeedApproval)
def on_tni_approval_saved(sender, instance, created, **kwargs):
    """
    TNI_PENDING_REVIEW — fires on create so the approver is notified immediately.
    TNI_APPROVAL       — fires when approval_status transitions to APPROVED.
    TNI_REJECTION      — fires when approval_status transitions to REJECTED.
    """
    try:
        svc = _svc()
        need = instance.training_need
        employee = need.employee
        skill_name = need.skill.skill_name

        if created and instance.approval_status == TNIApprovalStatus.PENDING:
            # ── TNI_PENDING_REVIEW → notify the approver ─────────────────
            approver_uid = _user_id(instance.approver)
            if approver_uid:
                try:
                    employee_name = employee.user_label()
                except Exception:
                    employee_name = employee.employee_code

                svc.notify_tni_pending_review(
                    manager_user_id=approver_uid,
                    employee_name=employee_name,
                    skill_name=skill_name,
                    approval_id=instance.pk,
                )

        elif not created:
            old_status = getattr(instance, "_old_approval_status", None)
            employee_uid = _user_id(employee)
            if not employee_uid:
                return

            if (
                old_status != TNIApprovalStatus.APPROVED
                and instance.approval_status == TNIApprovalStatus.APPROVED
            ):
                # ── TNI_APPROVAL → notify the employee ───────────────────
                svc.notify_tni_approved(
                    user_id=employee_uid,
                    skill_name=skill_name,
                    approval_id=instance.pk,
                )

            elif (
                old_status != TNIApprovalStatus.REJECTED
                and instance.approval_status == TNIApprovalStatus.REJECTED
            ):
                # ── TNI_REJECTION → notify the employee ──────────────────
                svc.notify_tni_rejected(
                    user_id=employee_uid,
                    skill_name=skill_name,
                    comments=instance.comments,
                    approval_id=instance.pk,
                )

    except Exception as exc:
        logger.error(
            "notifications.signals.on_tni_approval_saved failed: approval_id=%s error=%s",
            instance.pk, exc,
        )


# ===========================================================================
# 5. TrainingPlanApproval
#    Triggers:
#      PLAN_PENDING_APPROVAL — on create (status=PENDING) → notify admin/approver
#      PLAN_APPROVED         — on update status → APPROVED → notify submitter
#      PLAN_REJECTED         — on update status → REJECTED → notify submitter
# ===========================================================================

from apps.training_planning.models import TrainingPlanApproval  # noqa: E402
from apps.training_planning.constants import TrainingApprovalStatus  # noqa: E402


@receiver(pre_save, sender=TrainingPlanApproval)
def _capture_plan_approval_old_status(sender, instance, **kwargs):
    """Stash previous approval_status before update."""
    if instance.pk:
        try:
            instance._old_approval_status = (
                TrainingPlanApproval.objects
                .values_list("approval_status", flat=True)
                .get(pk=instance.pk)
            )
        except TrainingPlanApproval.DoesNotExist:
            instance._old_approval_status = None
    else:
        instance._old_approval_status = None


@receiver(post_save, sender=TrainingPlanApproval)
def on_plan_approval_saved(sender, instance, created, **kwargs):
    """
    PLAN_PENDING_APPROVAL — fires on create so the approver is notified.
    PLAN_APPROVED         — fires when approval_status transitions to APPROVED.
    PLAN_REJECTED         — fires when approval_status transitions to REJECTED.
    """
    try:
        svc = _svc()
        plan = instance.training_plan

        if created and instance.approval_status == TrainingApprovalStatus.PENDING:
            # ── PLAN_PENDING_APPROVAL → notify the approver ──────────────
            approver_uid = _user_id(instance.approver)
            if approver_uid:
                dept_name = plan.department.department_name
                svc.notify_plan_pending_approval(
                    admin_user_id=approver_uid,
                    plan_name=plan.plan_name,
                    dept_name=dept_name,
                    approval_id=instance.pk,
                )

        elif not created:
            old_status = getattr(instance, "_old_approval_status", None)

            # Notify the submitter (submitted_by) if available, else the plan creator.
            recipient = instance.submitted_by or plan.created_by
            recipient_uid = _user_id(recipient)
            if not recipient_uid:
                return

            if (
                old_status != TrainingApprovalStatus.APPROVED
                and instance.approval_status == TrainingApprovalStatus.APPROVED
            ):
                # ── PLAN_APPROVED ─────────────────────────────────────────
                svc.notify_plan_approved(
                    user_id=recipient_uid,
                    plan_name=plan.plan_name,
                    plan_id=plan.pk,
                )

            elif (
                old_status != TrainingApprovalStatus.REJECTED
                and instance.approval_status == TrainingApprovalStatus.REJECTED
            ):
                # ── PLAN_REJECTED ─────────────────────────────────────────
                svc.notify_plan_rejected(
                    user_id=recipient_uid,
                    plan_name=plan.plan_name,
                    comments=instance.comments,
                    plan_id=plan.pk,
                )

    except Exception as exc:
        logger.error(
            "notifications.signals.on_plan_approval_saved failed: approval_id=%s error=%s",
            instance.pk, exc,
        )


# ===========================================================================
# 6. TrainingSessionEnrollment
#    Trigger: SESSION_ENROLLED (on create)
# ===========================================================================

from apps.training_planning.models import TrainingSessionEnrollment  # noqa: E402


@receiver(post_save, sender=TrainingSessionEnrollment)
def on_session_enrollment_created(sender, instance, created, **kwargs):
    """
    SESSION_ENROLLED — fires once when an employee is enrolled in a session.
    """
    if not created:
        return
    try:
        uid = _user_id(instance.employee)
        if not uid:
            return

        session = instance.training_session
        session_date = session.session_start_date.strftime("%d %b %Y, %I:%M %p")

        _svc().notify_session_enrolled(
            user_id=uid,
            session_title=session.session_title,
            session_date=session_date,
            session_enrollment_id=instance.pk,
        )
    except Exception as exc:
        logger.error(
            "notifications.signals.on_session_enrollment_created failed: "
            "enrollment_id=%s error=%s",
            instance.pk, exc,
        )


# ===========================================================================
# 7. EmployeeSkillRating (skill_management)
#    Trigger: SKILL_RATING — when a MANAGER rating row is submitted
#    (status transitions to SUBMITTED by the manager)
# ===========================================================================

from apps.skill_management.models import EmployeeSkillRating  # noqa: E402


@receiver(pre_save, sender=EmployeeSkillRating)
def _capture_skill_rating_old_status(sender, instance, **kwargs):
    """
    Stash the previous status on the instance before update.
    Only needed for the notification signal — the skill_management app
    already has its own pre_save for history; this one is additive.
    """
    if instance.pk:
        try:
            instance._notif_old_status = (
                EmployeeSkillRating.objects
                .values_list("status", flat=True)
                .get(pk=instance.pk)
            )
        except EmployeeSkillRating.DoesNotExist:
            instance._notif_old_status = None
    else:
        instance._notif_old_status = None


@receiver(post_save, sender=EmployeeSkillRating)
def on_skill_rating_submitted(sender, instance, created, **kwargs):
    """
    SKILL_RATING — fires when a MANAGER rating transitions to SUBMITTED.
    Notifies the rated employee that their manager has submitted ratings.
    """
    if created:
        return
    try:
        # Only fire for manager ratings that just moved to SUBMITTED
        if instance.rating_type != "MANAGER":
            return

        old_status = getattr(instance, "_notif_old_status", None)
        if old_status == "SUBMITTED" or instance.status != "SUBMITTED":
            return

        uid = _user_id(instance.employee)
        if not uid:
            return

        _svc().notify_skill_rating_submitted(user_id=uid)

    except Exception as exc:
        logger.error(
            "notifications.signals.on_skill_rating_submitted failed: "
            "rating_id=%s error=%s",
            instance.pk, exc,
        )
