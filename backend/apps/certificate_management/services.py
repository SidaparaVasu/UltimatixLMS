"""
Certificate Management services.

CertificateIssuanceService     — auto-issues certificates on course completion / assessment pass
CertificateVerificationService — validates a certificate UUID for the public verify endpoint

CertificatePDFRenderer is defined in pdf_renderer.py and re-exported here so
callers can import from either location:
    from apps.certificate_management.services import CertificatePDFRenderer
    from apps.certificate_management.pdf_renderer import CertificatePDFRenderer
"""

import logging
from datetime import date, timedelta
from typing import Optional

from django.utils import timezone

from .pdf_renderer import CertificatePDFRenderer  # noqa: F401 — re-export

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CertificateIssuanceService
# ---------------------------------------------------------------------------

class CertificateIssuanceService:
    """
    Creates IssuedCertificate records when a learner completes a course or
    passes a standalone assessment.

    Both public methods are idempotent — calling them twice for the same
    entity_id will not create duplicate certificates.

    Expiry is read directly from:
        course.certificate_validity_days   (for course certificates)
        assessment.certificate_validity_days (for assessment certificates)

    Null = lifetime validity (no expiry date on the certificate).
    """

    def issue_for_course_completion(self, enrollment_id: int) -> Optional["IssuedCertificate"]:
        """
        Called by the post_save signal on UserCourseEnrollment when status → COMPLETED.

        Steps:
          1. Guard: skip if a certificate already exists for this enrollment
          2. Load enrollment + course (with certificate_validity_days)
          3. Calculate expiry_date from course.certificate_validity_days
          4. Generate PDF
          5. Save IssuedCertificate (with stored course_or_assessment_name)
          6. Send in-app notification
        """
        from apps.learning_progress.models import UserCourseEnrollment
        from .models import IssuedCertificate

        # 1. Idempotency guard
        if IssuedCertificate.objects.filter(
            certificate_type="course",
            entity_id=str(enrollment_id),
        ).exists():
            logger.debug(
                "Certificate already issued for enrollment %s — skipping.", enrollment_id
            )
            return None

        # 2. Load enrollment
        try:
            enrollment = UserCourseEnrollment.objects.select_related(
                "employee__user__profile", "course"
            ).get(id=enrollment_id)
        except UserCourseEnrollment.DoesNotExist:
            logger.error(
                "Enrollment %s not found — cannot issue certificate.", enrollment_id
            )
            return None

        # 3. Calculate dates
        completion_date = (
            enrollment.completed_at.date() if enrollment.completed_at else date.today()
        )
        expiry_date = None
        validity_days = enrollment.course.certificate_validity_days
        if validity_days:
            expiry_date = completion_date + timedelta(days=validity_days)

        course_name = enrollment.course.course_title

        # 4. Generate PDF
        pdf_file = None
        try:
            renderer = CertificatePDFRenderer()
            pdf_bytes = renderer.render_for_course(
                enrollment, completion_date, expiry_date
            )
            pdf_file = self._save_pdf(
                pdf_bytes,
                filename=f"certificate_course_{enrollment_id}.pdf",
                employee=enrollment.employee,
            )
        except Exception as exc:
            logger.warning(
                "PDF generation failed for enrollment %s: %s", enrollment_id, exc
            )
            # Certificate is still issued — PDF can be regenerated on download

        # 5. Save certificate
        cert = IssuedCertificate.objects.create(
            employee=enrollment.employee,
            certificate_type="course",
            entity_id=str(enrollment_id),
            course_or_assessment_name=course_name,
            completion_date=completion_date,
            expiry_date=expiry_date,
            pdf_file=pdf_file,
        )

        # 6. Notify learner
        self._notify_learner(
            user=enrollment.employee.user,
            course_or_assessment_name=course_name,
            certificate_id=cert.id,
        )

        logger.info(
            "Certificate %s issued for enrollment %s.", cert.certificate_id, enrollment_id
        )
        return cert

    def issue_for_assessment_pass(self, attempt_id) -> Optional["IssuedCertificate"]:
        """
        Called by the post_save signal on AssessmentResult when status → PASS.

        attempt_id is the UUID PK of AssessmentAttempt.
        """
        from apps.assessment_engine.models import AssessmentAttempt
        from .models import IssuedCertificate

        # 1. Idempotency guard
        if IssuedCertificate.objects.filter(
            certificate_type="assessment",
            entity_id=str(attempt_id),
        ).exists():
            logger.debug(
                "Certificate already issued for attempt %s — skipping.", attempt_id
            )
            return None

        # 2. Load attempt
        try:
            attempt = AssessmentAttempt.objects.select_related(
                "employee__user__profile", "assessment"
            ).get(id=attempt_id)
        except AssessmentAttempt.DoesNotExist:
            logger.error(
                "Attempt %s not found — cannot issue certificate.", attempt_id
            )
            return None

        # 3. Calculate dates
        completion_date = (
            attempt.submitted_at.date() if attempt.submitted_at else date.today()
        )
        expiry_date = None
        validity_days = attempt.assessment.certificate_validity_days
        if validity_days:
            expiry_date = completion_date + timedelta(days=validity_days)

        assessment_name = attempt.assessment.title

        # 4. Generate PDF
        pdf_file = None
        try:
            renderer = CertificatePDFRenderer()
            pdf_bytes = renderer.render_for_assessment(
                attempt, completion_date, expiry_date
            )
            pdf_file = self._save_pdf(
                pdf_bytes,
                filename=f"certificate_assessment_{attempt_id}.pdf",
                employee=attempt.employee,
            )
        except Exception as exc:
            logger.warning(
                "PDF generation failed for attempt %s: %s", attempt_id, exc
            )

        # 5. Save certificate
        cert = IssuedCertificate.objects.create(
            employee=attempt.employee,
            certificate_type="assessment",
            entity_id=str(attempt_id),
            course_or_assessment_name=assessment_name,
            completion_date=completion_date,
            expiry_date=expiry_date,
            pdf_file=pdf_file,
        )

        # 6. Notify learner
        self._notify_learner(
            user=attempt.employee.user,
            course_or_assessment_name=assessment_name,
            certificate_id=cert.id,
        )

        logger.info(
            "Certificate %s issued for attempt %s.", cert.certificate_id, attempt_id
        )
        return cert

    # ── Private helpers ───────────────────────────────────────────────────────

    def _save_pdf(self, pdf_bytes: bytes, filename: str, employee) -> Optional["FileRegistry"]:
        """Saves raw PDF bytes to FileRegistry and returns the record."""
        from django.core.files.base import ContentFile
        from apps.file_management.models import FileRegistry
        from apps.file_management.constants import FileType, FileUploadStatus

        try:
            registry = FileRegistry(
                original_name=filename,
                file_type=FileType.PDF,
                size_bytes=len(pdf_bytes),
                upload_status=FileUploadStatus.UPLOADED,
                uploaded_by=employee,
            )
            registry.file.save(filename, ContentFile(pdf_bytes), save=False)
            registry.save()
            return registry
        except Exception as exc:
            logger.error("Failed to save certificate PDF to FileRegistry: %s", exc)
            return None

    def _notify_learner(
        self, user, course_or_assessment_name: str, certificate_id: int
    ) -> None:
        """Creates an in-app notification for the learner."""
        try:
            from apps.notifications.models import Notification
            from apps.notifications.constants import NotificationType

            notification_type = (
                NotificationType.CERTIFICATE_ISSUED
                if hasattr(NotificationType, "CERTIFICATE_ISSUED")
                else "INFO"
            )
            Notification.objects.create(
                user=user,
                notification_type=notification_type,
                title="Your certificate is ready",
                message=(
                    f'Your certificate for "{course_or_assessment_name}" is ready. '
                    f"Visit My Certificates to download it."
                ),
                action_url="/my-certificates",
                entity_type="IssuedCertificate",
                entity_id=str(certificate_id),
            )
        except Exception as exc:
            logger.warning("Failed to create certificate notification: %s", exc)


# ---------------------------------------------------------------------------
# CertificateVerificationService
# ---------------------------------------------------------------------------

class CertificateVerificationService:
    """
    Validates a certificate UUID for the public verification endpoint.
    Returns a dict matching the CertificateVerificationResult frontend type.
    """

    def verify(self, certificate_uuid: str) -> dict:
        from .models import IssuedCertificate

        try:
            cert = IssuedCertificate.objects.select_related(
                "employee__user__profile",
            ).get(certificate_id=certificate_uuid)
        except (IssuedCertificate.DoesNotExist, Exception):
            return {
                "is_valid": False,
                "certificate_id": str(certificate_uuid),
                "learner_name": "",
                "course_or_assessment_name": "",
                "completion_date": "",
                "expiry_date": None,
                "status": "revoked",
                "issued_by": "",
            }

        # Resolve learner name
        profile = getattr(getattr(cert.employee, "user", None), "profile", None)
        learner_name = (
            f"{profile.first_name} {profile.last_name}".strip()
            if profile
            else cert.employee.employee_code
        )

        # Determine status
        if cert.is_revoked:
            status = "revoked"
        elif cert.expiry_date and cert.expiry_date < date.today():
            status = "expired"
        else:
            status = "active"

        return {
            "is_valid": not cert.is_revoked,
            "certificate_id": str(cert.certificate_id),
            "learner_name": learner_name,
            # Use the stored name — no extra DB query needed
            "course_or_assessment_name": cert.course_or_assessment_name,
            "completion_date": cert.completion_date.isoformat(),
            "expiry_date": cert.expiry_date.isoformat() if cert.expiry_date else None,
            "status": status,
            "issued_by": "Ultimatix LMS",
        }
