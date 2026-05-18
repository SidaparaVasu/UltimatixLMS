"""
Certificate Management views.

Endpoints (all under /api/v1/certificates/):

    IssuedCertificateViewSet
        GET  /                              — admin list (CERTIFICATE_MANAGE)
        GET  /my/                           — learner's own certificates (IsAuthenticated)
        GET  /:id/download/                 — PDF blob (IsAuthenticated)
        POST /:id/revoke/                   — revoke (CERTIFICATE_MANAGE)
        GET  /verify/:certificate_id/       — public, no auth (AllowAny)
"""

import logging

from django.http import FileResponse
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action

from common.response import (
    success_response,
    error_response,
    not_found_response,
)
from apps.rbac.permissions import HasScopedPermission
from apps.rbac.permission_codes import P

from .models import IssuedCertificate
from .serializers import (
    IssuedCertificateAdminSerializer,
    IssuedCertificateLearnerSerializer,
    CertificateVerificationSerializer,
    RevokeCertificateSerializer,
)
from .services import CertificateVerificationService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_employee(request):
    """Returns the EmployeeMaster for the requesting user, or None."""
    employee_qs = getattr(request.user, "employee_record", None)
    return employee_qs.first() if employee_qs else None


def _has_certificate_manage(user) -> bool:
    """Quick permission check without instantiating a view."""
    from apps.rbac.services.rbac_engine import RBACEngine
    return RBACEngine.has_permission(user, P.SYSTEM_ADMINISTRATION.CERTIFICATE_MANAGE)


# ---------------------------------------------------------------------------
# IssuedCertificateViewSet
# ---------------------------------------------------------------------------

class IssuedCertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for issued certificates.

    Certificates are never created via the API — they are auto-issued by
    CertificateIssuanceService via Django signals.

    Extra actions:
        GET  /my/                       — learner's own certificates
        GET  /:id/download/             — PDF blob (raw binary, no envelope)
        POST /:id/revoke/               — admin revoke
        GET  /verify/:certificate_id/   — public verification (AllowAny)
    """

    queryset = IssuedCertificate.objects.select_related(
        "employee__user__profile",
    ).order_by("-issued_at")
    serializer_class = IssuedCertificateAdminSerializer
    permission_classes = [HasScopedPermission]
    required_permission = P.SYSTEM_ADMINISTRATION.CERTIFICATE_MANAGE

    # ── Admin list ────────────────────────────────────────────────────────────

    def get_queryset(self):
        qs = super().get_queryset()

        learner_name = self.request.query_params.get("learner_name", "").strip()
        certificate_type = self.request.query_params.get("certificate_type", "").strip()
        status_filter = self.request.query_params.get("status", "").strip()

        if learner_name:
            from django.db.models import Q
            qs = qs.filter(
                Q(employee__user__profile__first_name__icontains=learner_name)
                | Q(employee__user__profile__last_name__icontains=learner_name)
                | Q(employee__employee_code__icontains=learner_name)
                | Q(course_or_assessment_name__icontains=learner_name)
            )

        if certificate_type in ("course", "assessment"):
            qs = qs.filter(certificate_type=certificate_type)

        if status_filter == "active":
            from django.db.models import Q
            from datetime import date
            qs = qs.filter(is_revoked=False).filter(
                Q(expiry_date__isnull=True) | Q(expiry_date__gte=date.today())
            )
        elif status_filter == "expired":
            from datetime import date
            qs = qs.filter(is_revoked=False, expiry_date__lt=date.today())
        elif status_filter == "revoked":
            qs = qs.filter(is_revoked=True)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)

    # ── GET /my/ ──────────────────────────────────────────────────────────────

    @action(
        detail=False,
        methods=["get"],
        url_path="my",
        permission_classes=[permissions.IsAuthenticated],
    )
    def my_certificates(self, request):
        """
        Returns the authenticated learner's own certificates.
        Supports optional ?status=active|expired|revoked and pagination.
        """
        employee = _get_employee(request)
        if not employee:
            return error_response(
                message="No employee record found for this user.",
                status_code=404,
            )

        qs = IssuedCertificate.objects.filter(
            employee=employee,
        ).order_by("-issued_at")

        status_filter = request.query_params.get("status", "").strip()
        if status_filter == "active":
            from django.db.models import Q
            from datetime import date
            qs = qs.filter(is_revoked=False).filter(
                Q(expiry_date__isnull=True) | Q(expiry_date__gte=date.today())
            )
        elif status_filter == "expired":
            from datetime import date
            qs = qs.filter(is_revoked=False, expiry_date__lt=date.today())
        elif status_filter == "revoked":
            qs = qs.filter(is_revoked=True)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = IssuedCertificateLearnerSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = IssuedCertificateLearnerSerializer(qs, many=True)
        return success_response(data=serializer.data)

    # ── GET /:id/download/ ────────────────────────────────────────────────────

    @action(
        detail=True,
        methods=["get"],
        url_path="download",
        permission_classes=[permissions.IsAuthenticated],
    )
    def download(self, request, pk=None):
        """
        Streams the certificate PDF as a raw binary response.

        Does NOT use the standard success/error envelope — the response is a
        FileResponse with content_type='application/pdf' so the browser can
        trigger a file download directly.

        Learners can only download their own certificates.
        Admins with CERTIFICATE_MANAGE can download any certificate.
        """
        try:
            cert = IssuedCertificate.objects.select_related(
                "employee__user", "pdf_file"
            ).get(pk=pk)
        except IssuedCertificate.DoesNotExist:
            return not_found_response("Certificate not found.")

        # Ownership check — learners can only download their own certs
        employee = _get_employee(request)
        is_admin = request.user.is_superuser or _has_certificate_manage(request.user)
        if not is_admin and (not employee or cert.employee_id != employee.id):
            from common.response import forbidden_response
            return forbidden_response("You do not have permission to download this certificate.")

        # Stream from FileRegistry if available
        if cert.pdf_file and cert.pdf_file.file:
            try:
                response = FileResponse(
                    cert.pdf_file.file.open("rb"),
                    content_type="application/pdf",
                )
                filename = f"certificate-{cert.certificate_id}.pdf"
                response["Content-Disposition"] = f'attachment; filename="{filename}"'
                return response
            except Exception as exc:
                logger.error("Failed to stream certificate PDF %s: %s", cert.id, exc)
                # Fall through to on-demand generation

        # PDF not yet generated — attempt on-demand generation
        try:
            from .services import CertificatePDFRenderer, CertificateIssuanceService
            import io

            renderer = CertificatePDFRenderer()
            if cert.certificate_type == "course":
                from apps.learning_progress.models import UserCourseEnrollment
                enrollment = UserCourseEnrollment.objects.select_related(
                    "employee__user__profile", "course"
                ).get(id=cert.entity_id)
                pdf_bytes = renderer.render_for_course(
                    enrollment, cert.completion_date, cert.expiry_date
                )
            else:
                from apps.assessment_engine.models import AssessmentAttempt
                attempt = AssessmentAttempt.objects.select_related(
                    "employee__user__profile", "assessment"
                ).get(id=cert.entity_id)
                pdf_bytes = renderer.render_for_assessment(
                    attempt, cert.completion_date, cert.expiry_date
                )

            # Save for future requests
            issuance_svc = CertificateIssuanceService()
            pdf_file = issuance_svc._save_pdf(
                pdf_bytes,
                filename=f"certificate_{cert.certificate_type}_{cert.entity_id}.pdf",
                employee=cert.employee,
            )
            if pdf_file:
                cert.pdf_file = pdf_file
                cert.save(update_fields=["pdf_file"])

            response = FileResponse(
                io.BytesIO(pdf_bytes),
                content_type="application/pdf",
            )
            filename = f"certificate-{cert.certificate_id}.pdf"
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        except Exception as exc:
            logger.error("On-demand PDF generation failed for cert %s: %s", cert.id, exc)
            return error_response(
                message="Certificate PDF could not be generated. Please try again later.",
                status_code=500,
            )

    # ── POST /:id/revoke/ ─────────────────────────────────────────────────────

    @action(
        detail=True,
        methods=["post"],
        url_path="revoke",
        permission_classes=[HasScopedPermission],
        required_permission=P.SYSTEM_ADMINISTRATION.CERTIFICATE_MANAGE,
    )
    def revoke(self, request, pk=None):
        """
        Revokes an issued certificate.

        Payload: { "reason": "<string, 1–500 chars>" }

        Creates a CertificateRevocationLog entry for the audit trail.
        Idempotent — revoking an already-revoked certificate returns 400.
        """
        try:
            cert = IssuedCertificate.objects.get(pk=pk)
        except IssuedCertificate.DoesNotExist:
            return not_found_response("Certificate not found.")

        if cert.is_revoked:
            return error_response(
                message="This certificate has already been revoked.",
                status_code=400,
            )

        serializer = RevokeCertificateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid revocation payload.",
                errors=serializer.errors,
            )

        reason = serializer.validated_data["reason"]
        employee = _get_employee(request)

        cert.is_revoked = True
        cert.revoked_at = timezone.now()
        cert.revoked_by = employee
        cert.revocation_reason = reason
        cert.save(update_fields=["is_revoked", "revoked_at", "revoked_by", "revocation_reason"])

        from .models import CertificateRevocationLog
        CertificateRevocationLog.objects.create(
            certificate=cert,
            revoked_by=employee,
            reason=reason,
        )

        logger.info(
            "Certificate %s revoked by %s. Reason: %s",
            cert.certificate_id,
            getattr(employee, "employee_code", "unknown"),
            reason,
        )

        return success_response(
            message="Certificate revoked successfully.",
            data={"certificate_id": str(cert.certificate_id)},
        )

    # ── GET /verify/:certificate_id/ ─────────────────────────────────────────

    @action(
        detail=False,
        methods=["get"],
        url_path=r"verify/(?P<certificate_id>[^/.]+)",
        permission_classes=[permissions.AllowAny],
    )
    def verify(self, request, certificate_id=None):
        """
        Public endpoint — no authentication required.

        Returns a CertificateVerificationResult dict for the given UUID.
        Always returns 200 so the frontend can render the appropriate state
        without treating it as a network error.
        """
        service = CertificateVerificationService()
        result = service.verify(certificate_id)
        serializer = CertificateVerificationSerializer(data=result)
        if serializer.is_valid():
            return success_response(data=serializer.validated_data)
        return success_response(data=result)
