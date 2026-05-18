"""
Certificate Management serializers.

Serializer contexts:
    IssuedCertificateAdminSerializer    — admin list/detail
    IssuedCertificateLearnerSerializer  — learner /my/ endpoint
    CertificateVerificationSerializer   — public verify response
    RevokeCertificateSerializer         — POST /revoke/ payload
"""

from rest_framework import serializers

from .models import IssuedCertificate


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
