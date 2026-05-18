"""
Management command: regenerate_certificate_pdfs

Regenerates PDF files for all issued certificates, embedding the correct
QR code (verification URL) and watermark.

Use this to fix certificates that were generated before the QR code fix
(where certificate_uuid was empty in the PDF context).

Usage:
    python manage.py regenerate_certificate_pdfs
    python manage.py regenerate_certificate_pdfs --id 42          # single cert
    python manage.py regenerate_certificate_pdfs --dry-run        # preview only
    python manage.py regenerate_certificate_pdfs --force          # re-render even if pdf_file exists
"""

import logging
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Regenerate certificate PDFs with QR codes for all (or specific) issued certificates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--id",
            type=int,
            dest="cert_id",
            default=None,
            help="Regenerate only the certificate with this database ID.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print what would be done without making any changes.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            default=False,
            help="Re-render even if a pdf_file already exists.",
        )

    def handle(self, *args, **options):
        from apps.certificate_management.models import IssuedCertificate
        from apps.certificate_management.services import (
            CertificateIssuanceService,
            CertificatePDFRenderer,
        )
        from apps.learning_progress.models import UserCourseEnrollment
        from apps.assessment_engine.models import AssessmentAttempt

        dry_run = options["dry_run"]
        force = options["force"]
        cert_id = options["cert_id"]

        qs = IssuedCertificate.objects.select_related(
            "employee__user__profile", "pdf_file"
        ).order_by("id")

        if cert_id:
            qs = qs.filter(id=cert_id)

        if not force:
            # Only process certs that have no PDF yet
            qs = qs.filter(pdf_file__isnull=True)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS(
                "No certificates need PDF regeneration."
                + (" (use --force to re-render existing PDFs)" if not force else "")
            ))
            return

        self.stdout.write(f"{'[DRY RUN] ' if dry_run else ''}Regenerating PDFs for {total} certificate(s)...")

        renderer = CertificatePDFRenderer()
        svc = CertificateIssuanceService()
        success = 0
        failed = 0

        for cert in qs.iterator():
            label = f"Cert #{cert.id} ({cert.certificate_type}, UUID={cert.certificate_id})"
            try:
                if cert.certificate_type == "course":
                    enrollment = UserCourseEnrollment.objects.select_related(
                        "employee__user__profile", "course"
                    ).get(id=cert.entity_id)
                    pdf_bytes = renderer.render_for_course(
                        enrollment,
                        cert.completion_date,
                        cert.expiry_date,
                        certificate_uuid=str(cert.certificate_id),
                    )
                    filename = f"certificate_course_{cert.entity_id}.pdf"
                else:
                    attempt = AssessmentAttempt.objects.select_related(
                        "employee__user__profile", "assessment"
                    ).get(id=cert.entity_id)
                    pdf_bytes = renderer.render_for_assessment(
                        attempt,
                        cert.completion_date,
                        cert.expiry_date,
                        certificate_uuid=str(cert.certificate_id),
                    )
                    filename = f"certificate_assessment_{cert.entity_id}.pdf"

                if dry_run:
                    self.stdout.write(f"  [DRY RUN] Would regenerate {label} ({len(pdf_bytes)} bytes)")
                    success += 1
                    continue

                # Delete old PDF file if it exists
                if cert.pdf_file:
                    try:
                        cert.pdf_file.file.delete(save=False)
                        cert.pdf_file.delete()
                    except Exception:
                        pass  # Old file cleanup is best-effort

                pdf_file = svc._save_pdf(pdf_bytes, filename, cert.employee)
                if pdf_file:
                    cert.pdf_file = pdf_file
                    cert.save(update_fields=["pdf_file"])
                    self.stdout.write(f"  ✓ {label}")
                    success += 1
                else:
                    self.stderr.write(f"  ✗ {label} — failed to save PDF to FileRegistry")
                    failed += 1

            except Exception as exc:
                self.stderr.write(f"  ✗ {label} — {exc}")
                failed += 1

        self.stdout.write("")
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"[DRY RUN] Would regenerate {success} PDF(s)."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Done. {success} regenerated, {failed} failed."))
