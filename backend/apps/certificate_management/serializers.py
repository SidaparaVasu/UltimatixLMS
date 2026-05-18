"""
Certificate Management serializers.

Serializer contexts:
    IssuedCertificateAdminSerializer    — admin list/detail
    IssuedCertificateLearnerSerializer  — learner /my/ endpoint
    CertificateVerificationSerializer   — public verify response
    RevokeCertificateSerializer         — POST /revoke/ payload
"""

from datetime import date

from rest_framework import serializers

from .models import IssuedCertificate, CertificateRenewalLog


class CertificateRenewalLogSerializer(serializers.ModelSerializer):
    """Read-only renewal history entry for admin certificate responses."""
    renewed_by_name = serializers.SerializerMethodField()
    renewed_by_code = serializers.CharField(
        source="renewed_by.employee_code",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = CertificateRenewalLog
        fields = [
            "id",
            "previous_expiry_date",
            "new_expiry_date",
            "reason",
            "renewed_at",
            "renewed_by_name",
            "renewed_by_code",
        ]

    def get_renewed_by_name(self, obj) -> str:
        if not obj.renewed_by:
            return ""
        try:
            p = obj.renewed_by.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.renewed_by.user.username
        except Exception:
            return getattr(obj.renewed_by, "employee_code", str(obj.renewed_by_id))


# ---------------------------------------------------------------------------
# Issued certificate serializers
# ---------------------------------------------------------------------------

class IssuedCertificateAdminSerializer(serializers.ModelSerializer):
    """
    Admin list/detail serializer.

    course_or_assessment_name is stored on the model at issuance time —
    no per-row DB lookup needed, no N+1.
    """
    learner_name = serializers.SerializerMethodField()
    learner_id = serializers.IntegerField(source="employee_id", read_only=True)
    employee_code = serializers.CharField(
        source="employee.employee_code",
        read_only=True,
    )
    status = serializers.SerializerMethodField()
    verification_url = serializers.SerializerMethodField()
    renewal_count = serializers.SerializerMethodField()
    latest_renewal = serializers.SerializerMethodField()
    renewal_logs = CertificateRenewalLogSerializer(many=True, read_only=True)

    class Meta:
        model = IssuedCertificate
        fields = [
            "id",
            "certificate_id",
            "learner_name",
            "learner_id",
            "employee_code",
            "course_or_assessment_name",
            "certificate_type",
            "completion_date",
            "expiry_date",
            "issued_at",
            "status",
            "is_revoked",
            "revoked_at",
            "revocation_reason",
            "verification_url",
            "renewal_count",
            "latest_renewal",
            "renewal_logs",
        ]

    def get_learner_name(self, obj) -> str:
        try:
            p = obj.employee.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.employee.user.username
        except Exception:
            return getattr(obj.employee, "employee_code", str(obj.employee_id))

    def get_status(self, obj) -> str:
        return obj.status

    def get_verification_url(self, obj) -> str:
        return obj.verification_url

    def get_renewal_count(self, obj) -> int:
        annotated_count = getattr(obj, "renewal_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.renewal_logs.count()

    def get_latest_renewal(self, obj):
        latest = None
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("renewal_logs")
        if prefetched is not None:
            latest = prefetched[0] if prefetched else None
        else:
            latest = obj.renewal_logs.order_by("-renewed_at").first()
        return CertificateRenewalLogSerializer(latest).data if latest else None


class IssuedCertificateLearnerSerializer(serializers.ModelSerializer):
    """
    Learner-facing serializer for GET /certificates/my/.

    Exposes only the fields the learner needs — no admin-only fields like
    revoked_by or revocation_reason.
    """
    status = serializers.SerializerMethodField()
    verification_url = serializers.SerializerMethodField()

    class Meta:
        model = IssuedCertificate
        fields = [
            "id",
            "certificate_id",
            "course_or_assessment_name",
            "certificate_type",
            "completion_date",
            "expiry_date",
            "issued_at",
            "status",
            "is_revoked",
            "verification_url",
        ]

    def get_status(self, obj) -> str:
        return obj.status

    def get_verification_url(self, obj) -> str:
        return obj.verification_url


# ---------------------------------------------------------------------------
# Public verification serializer
# ---------------------------------------------------------------------------

class CertificateVerificationSerializer(serializers.Serializer):
    """
    Read-only serializer for the public verification endpoint response.

    Plain Serializer (not ModelSerializer) because the data is assembled
    by CertificateVerificationService.verify() and returned as a dict.
    """
    is_valid = serializers.BooleanField()
    certificate_id = serializers.CharField()
    learner_name = serializers.CharField()
    course_or_assessment_name = serializers.CharField()
    completion_date = serializers.CharField()
    expiry_date = serializers.CharField(allow_null=True)
    status = serializers.ChoiceField(choices=["active", "expired", "revoked"])
    issued_by = serializers.CharField()


# ---------------------------------------------------------------------------
# Revoke payload serializer
# ---------------------------------------------------------------------------

class RevokeCertificateSerializer(serializers.Serializer):
    """
    Payload for POST /certificates/:id/revoke/.

    reason is required and must be 1–500 characters.
    """
    reason = serializers.CharField(
        min_length=1,
        max_length=500,
        error_messages={
            "blank": "Revocation reason cannot be blank.",
            "min_length": "Revocation reason must be at least 1 character.",
            "max_length": "Revocation reason cannot exceed 500 characters.",
        },
    )


class RenewCertificateSerializer(serializers.Serializer):
    """
    Payload for POST /certificates/:id/renew/.

    expiry_date must be a future date. reason is optional but capped to keep
    history entries readable in the admin UI.
    """
    expiry_date = serializers.DateField()
    reason = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        default="",
        error_messages={
            "max_length": "Renewal reason cannot exceed 500 characters.",
        },
    )

    def validate_expiry_date(self, value):
        if value <= date.today():
            raise serializers.ValidationError("New expiry date must be in the future.")
        return value
