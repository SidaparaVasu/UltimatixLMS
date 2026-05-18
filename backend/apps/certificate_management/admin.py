"""
Certificate Management Django admin registrations.

Models registered:
    IssuedCertificate        — read-only audit view; bulk revoke action
    CertificateRevocationLog — read-only audit trail
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from .models import IssuedCertificate, CertificateRevocationLog, CertificateRenewalLog


# ---------------------------------------------------------------------------
# Inline: revocation log entries shown inside IssuedCertificate detail
# ---------------------------------------------------------------------------

class CertificateRevocationLogInline(admin.TabularInline):
    model = CertificateRevocationLog
    extra = 0
    can_delete = False
    readonly_fields = ("revoked_by", "reason", "revoked_at")
    fields = ("revoked_by", "reason", "revoked_at")
    verbose_name = "Revocation Log Entry"
    verbose_name_plural = "Revocation Log"

    def has_add_permission(self, request, obj=None):
        return False


class CertificateRenewalLogInline(admin.TabularInline):
    model = CertificateRenewalLog
    extra = 0
    can_delete = False
    readonly_fields = (
        "previous_expiry_date",
        "new_expiry_date",
        "renewed_by",
        "reason",
        "renewed_at",
    )
    fields = (
        "previous_expiry_date",
        "new_expiry_date",
        "renewed_by",
        "reason",
        "renewed_at",
    )
    verbose_name = "Renewal Log Entry"
    verbose_name_plural = "Renewal Log"

    def has_add_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# IssuedCertificate
# ---------------------------------------------------------------------------

@admin.register(IssuedCertificate)
class IssuedCertificateAdmin(admin.ModelAdmin):
    list_display = [
        "certificate_id",
        "employee",
        "certificate_type",
        "course_or_assessment_name",
        "status_display",
        "completion_date",
        "expiry_date",
        "issued_at",
        "is_revoked",
    ]
    list_filter = ["certificate_type", "is_revoked"]
    search_fields = [
        "employee__employee_code",
        "employee__user__profile__first_name",
        "employee__user__profile__last_name",
        "certificate_id",
        "course_or_assessment_name",
    ]
    ordering = ["-issued_at"]
    inlines = [CertificateRenewalLogInline, CertificateRevocationLogInline]
    actions = ["revoke_certificates"]

    # Certificates are auto-issued only — no manual creation
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.display(description="Status")
    def status_display(self, obj):
        if obj.is_revoked:
            return format_html('<span style="color:#9ca3af;">Revoked</span>')
        if obj.status == "expired":
            return format_html('<span style="color:#ef4444;">Expired</span>')
        return format_html('<span style="color:#22c55e;">Active</span>')

    @admin.action(description="Revoke selected certificates")
    def revoke_certificates(self, request, queryset):
        already_revoked = queryset.filter(is_revoked=True).count()
        to_revoke = queryset.filter(is_revoked=False)
        count = to_revoke.count()

        now = timezone.now()
        employee = getattr(request.user, "employee_record", None)
        employee = employee.first() if employee else None

        for cert in to_revoke:
            cert.is_revoked = True
            cert.revoked_at = now
            cert.revoked_by = employee
            cert.revocation_reason = "Bulk revoked via Django admin."
            cert.save(update_fields=[
                "is_revoked", "revoked_at", "revoked_by", "revocation_reason"
            ])
            CertificateRevocationLog.objects.create(
                certificate=cert,
                revoked_by=employee,
                reason="Bulk revoked via Django admin.",
            )

        msg_parts = []
        if count:
            msg_parts.append(f"{count} certificate(s) revoked.")
        if already_revoked:
            msg_parts.append(f"{already_revoked} were already revoked and skipped.")
        self.message_user(request, " ".join(msg_parts))


# ---------------------------------------------------------------------------
# CertificateRevocationLog
# ---------------------------------------------------------------------------

@admin.register(CertificateRenewalLog)
class CertificateRenewalLogAdmin(admin.ModelAdmin):
    list_display = [
        "certificate",
        "previous_expiry_date",
        "new_expiry_date",
        "renewed_by",
        "reason_short",
        "renewed_at",
    ]
    search_fields = [
        "certificate__certificate_id",
        "renewed_by__employee_code",
    ]
    readonly_fields = [
        "certificate",
        "previous_expiry_date",
        "new_expiry_date",
        "previous_pdf_file",
        "renewed_by",
        "reason",
        "renewed_at",
    ]
    ordering = ["-renewed_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.display(description="Reason")
    def reason_short(self, obj):
        return obj.reason[:80] + "..." if len(obj.reason) > 80 else obj.reason


@admin.register(CertificateRevocationLog)
class CertificateRevocationLogAdmin(admin.ModelAdmin):
    list_display = [
        "certificate",
        "revoked_by",
        "reason_short",
        "revoked_at",
    ]
    search_fields = [
        "certificate__certificate_id",
        "revoked_by__employee_code",
    ]
    readonly_fields = ["certificate", "revoked_by", "reason", "revoked_at"]
    ordering = ["-revoked_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.display(description="Reason")
    def reason_short(self, obj):
        return obj.reason[:80] + "…" if len(obj.reason) > 80 else obj.reason
