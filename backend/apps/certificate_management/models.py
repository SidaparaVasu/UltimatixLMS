"""
Certificate Management models.

Tables:
    cert_issued          — Issued certificate records (auto-created on completion)
    cert_revocation_log  — Audit trail for revocations

Design decisions:
    - No custom template model: all certificates use the default PDF layout with
      the Ultimatix LMS watermark. Expiry is configured on CourseMaster /
      AssessmentMaster via certificate_validity_days.
    - course_or_assessment_name is stored at issuance time to avoid N+1 queries
      on list views and to preserve the name even if the course/assessment is
      later renamed or deleted.
    - verification_url returns a relative path; the frontend prepends
      window.location.origin when copying to clipboard.
"""

import uuid
from datetime import date

from django.db import models

from .constants import CertificateType, CertificateStatus


class IssuedCertificate(models.Model):
    """
    A certificate issued to a learner upon completing a course or passing an assessment.

    Auto-created by CertificateIssuanceService via Django signals.
    Never created manually via the API.

    entity_id is a logical FK:
        certificate_type='course'     → entity_id = UserCourseEnrollment.id
        certificate_type='assessment' → entity_id = AssessmentAttempt.id (UUID stored as string)
    """
    certificate_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        help_text="Public UUID embedded in QR codes and verification URLs.",
    )
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="issued_certificates",
        help_text="Learner who earned this certificate.",
    )
    certificate_type = models.CharField(
        max_length=20,
        choices=CertificateType.choices,
    )
    entity_id = models.CharField(
        max_length=100,
        help_text=(
            "PK of the enrollment (course) or attempt (assessment) that triggered issuance. "
            "Stored as a string to accommodate both integer and UUID PKs."
        ),
    )
    # Denormalised name — stored at issuance time to avoid N+1 on list views
    # and to preserve the name if the course/assessment is later renamed.
    course_or_assessment_name = models.CharField(
        max_length=255,
        default="",
        help_text="Human-readable name of the course or assessment, stored at issuance time.",
    )
    completion_date = models.DateField(
        help_text="Date the course was completed or the assessment was passed.",
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date after which the certificate is considered expired. Null = lifetime validity.",
    )
    issued_at = models.DateTimeField(auto_now_add=True)

    # ── Revocation ────────────────────────────────────────────────────────────
    is_revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revoked_certificates",
        help_text="Admin who revoked this certificate.",
    )
    revocation_reason = models.TextField(blank=True, default="")

    # ── PDF storage ───────────────────────────────────────────────────────────
    pdf_file = models.ForeignKey(
        "file_management.FileRegistry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificate_pdfs",
        help_text="Generated PDF stored in the file registry.",
    )

    class Meta:
        db_table = "cert_issued"
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["employee", "certificate_type"], name="idx_cert_emp_type"),
            models.Index(fields=["certificate_id"],               name="idx_cert_uuid"),
            models.Index(fields=["entity_id", "certificate_type"], name="idx_cert_entity"),
        ]
        verbose_name = "Issued Certificate"
        verbose_name_plural = "Issued Certificates"

    def __str__(self):
        return f"Cert<{self.certificate_id} | {self.employee_id} | {self.certificate_type}>"

    @property
    def status(self) -> str:
        """Derived status — never stored, always computed from expiry_date."""
        if self.expiry_date and self.expiry_date < date.today():
            return CertificateStatus.EXPIRED
        return CertificateStatus.ACTIVE

    @property
    def verification_url(self) -> str:
        """
        Relative frontend verification URL.
        The frontend prepends window.location.origin when copying to clipboard.
        """
        return f"/verify/certificate/{self.certificate_id}"


class CertificateRevocationLog(models.Model):
    """
    Immutable audit trail entry created whenever a certificate is revoked.
    """
    certificate = models.ForeignKey(
        IssuedCertificate,
        on_delete=models.CASCADE,
        related_name="revocation_logs",
    )
    revoked_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revocation_log_entries",
    )
    reason = models.TextField()
    revoked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cert_revocation_log"
        ordering = ["-revoked_at"]
        verbose_name = "Certificate Revocation Log"
        verbose_name_plural = "Certificate Revocation Logs"

    def __str__(self):
        return f"RevocationLog<cert={self.certificate_id} at {self.revoked_at}>"


class CertificateRenewalLog(models.Model):
    """
    Immutable audit trail entry created whenever an expired certificate is renewed.

    The IssuedCertificate row stores the current live expiry date. This log keeps
    the prior expiry date and previous PDF reference so renewal history is never
    lost when the live certificate is updated.
    """
    certificate = models.ForeignKey(
        IssuedCertificate,
        on_delete=models.CASCADE,
        related_name="renewal_logs",
    )
    previous_expiry_date = models.DateField(null=True, blank=True)
    new_expiry_date = models.DateField()
    previous_pdf_file = models.ForeignKey(
        "file_management.FileRegistry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificate_renewal_previous_pdfs",
        help_text="PDF attached to the certificate before this renewal, if any.",
    )
    renewed_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificate_renewal_entries",
    )
    reason = models.TextField(blank=True, default="")
    renewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cert_renewal_log"
        ordering = ["-renewed_at"]
        verbose_name = "Certificate Renewal Log"
        verbose_name_plural = "Certificate Renewal Logs"

    def __str__(self):
        return f"RenewalLog<cert={self.certificate_id} at {self.renewed_at}>"
