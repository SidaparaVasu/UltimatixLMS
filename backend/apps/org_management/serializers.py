from django.utils import timezone
from rest_framework import serializers

from apps.auth_security.constants import GenderChoice
from apps.auth_security.models import AuthUser, AuthUserProfile
from common.validators import (
    validate_email_format,
    validate_password_strength,
    validate_phone_number,
    validate_username,
)
from .constants import RelationshipType
from .models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    LocationMaster,
    JobRoleMaster,
    EmployeeMaster,
    EmployeeReportingManager
)


class CompanyMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyMaster
        fields = ["id", "company_name", "company_code", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BusinessUnitMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessUnitMaster
        fields = ["id", "company", "business_unit_name", "business_unit_code", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "company", "created_at", "updated_at"]


class BusinessUnitOptionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="business_unit_name", read_only=True)

    class Meta:
        model = BusinessUnitMaster
        fields = ["id", "name"]
        read_only_fields = fields


class DepartmentMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentMaster
        fields = ["id", "business_unit", "department_name", "department_code", "description", "parent_department", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DepartmentOptionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="department_name", read_only=True)

    class Meta:
        model = DepartmentMaster
        fields = ["id", "name"]
        read_only_fields = fields


class LocationMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationMaster
        fields = ["id", "company", "location_name", "location_code", "address", "city", "state", "country", "postal_code", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "company", "created_at", "updated_at"]


class LocationOptionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="location_name", read_only=True)

    class Meta:
        model = LocationMaster
        fields = ["id", "name"]
        read_only_fields = fields


class JobRoleMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRoleMaster
        fields = ["id", "company", "job_role_name", "job_role_code", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "company", "created_at", "updated_at"]


class JobRoleOptionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="job_role_name", read_only=True)

    class Meta:
        model = JobRoleMaster
        fields = ["id", "name"]
        read_only_fields = fields


class EmployeeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeMaster
        fields = [
            "id", "user", "employee_code",
            "user_label", "user_email",
            "company", "business_unit", "department", "job_role", "location",
            "company_label", "business_unit_label", "department_label", "job_role_label", "location_label",
            "joining_date", "employment_status", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


GENDER_WRITE_MAP = {
    "male": GenderChoice.MALE,
    "female": GenderChoice.FEMALE,
    "other": GenderChoice.OTHER,
    GenderChoice.MALE: GenderChoice.MALE,
    GenderChoice.FEMALE: GenderChoice.FEMALE,
    GenderChoice.OTHER: GenderChoice.OTHER,
}

GENDER_READ_MAP = {
    GenderChoice.MALE: "male",
    GenderChoice.FEMALE: "female",
    GenderChoice.OTHER: "other",
}


class EmployeeDirectorySerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    date_of_birth = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    company_name = serializers.CharField(source="company.company_name", read_only=True)
    business_unit_name = serializers.CharField(source="business_unit.business_unit_name", read_only=True)
    department_name = serializers.CharField(source="department.department_name", read_only=True)
    job_role_name = serializers.CharField(source="job_role.job_role_name", read_only=True)
    location_name = serializers.CharField(source="location.location_name", read_only=True)
    manager = serializers.SerializerMethodField()
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeMaster
        fields = [
            "id", "user", "username", "email",
            "first_name", "last_name", "full_name", "phone_number",
            "profile_image_url", "date_of_birth", "gender",
            "employee_code",
            "company", "company_name",
            "business_unit", "business_unit_name",
            "department", "department_name",
            "job_role", "job_role_name",
            "location", "location_name",
            "manager", "manager_name",
            "joining_date", "is_active", "employment_status",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    @staticmethod
    def _get_profile(obj):
        if not obj.user:
            return None

        try:
            return obj.user.profile
        except AuthUserProfile.DoesNotExist:
            return None

    @staticmethod
    def _get_direct_manager(obj):
        links = getattr(obj, "direct_manager_links", None)
        if links is not None:
            return links[0].manager if links else None

        direct_link = obj.managers.filter(relationship_type=RelationshipType.DIRECT).select_related(
            "manager", "manager__user", "manager__user__profile"
        ).first()
        return direct_link.manager if direct_link else None

    def get_username(self, obj):
        return obj.user.username if obj.user else ""

    def get_email(self, obj):
        return obj.user.email if obj.user else ""

    def get_first_name(self, obj):
        profile = self._get_profile(obj)
        return profile.first_name if profile else ""

    def get_last_name(self, obj):
        profile = self._get_profile(obj)
        return profile.last_name if profile else ""

    def get_full_name(self, obj):
        first_name = self.get_first_name(obj)
        last_name = self.get_last_name(obj)
        return f"{first_name} {last_name}".strip()

    def get_phone_number(self, obj):
        profile = self._get_profile(obj)
        return profile.phone_number if profile else None

    def get_profile_image_url(self, obj):
        profile = self._get_profile(obj)
        return profile.profile_image_url if profile else None

    def get_date_of_birth(self, obj):
        profile = self._get_profile(obj)
        return profile.date_of_birth if profile else None

    def get_gender(self, obj):
        profile = self._get_profile(obj)
        if not profile or not profile.gender:
            return None
        return GENDER_READ_MAP.get(profile.gender, None)

    def get_is_active(self, obj):
        return bool(obj.user and obj.user.is_active)

    def get_manager(self, obj):
        manager = self._get_direct_manager(obj)
        return manager.pk if manager else None

    def get_manager_name(self, obj):
        manager = self._get_direct_manager(obj)
        if not manager or not manager.user:
            return ""

        profile = getattr(manager.user, "profile", None)
        if profile:
            return f"{profile.first_name} {profile.last_name}".strip() or manager.user.username

        return manager.user.username


class EmployeeManagerOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeMaster
        fields = ["id", "employee_code", "full_name", "email"]
        read_only_fields = fields

    def get_full_name(self, obj):
        if obj.user:
            try:
                name = f"{obj.user.profile.first_name} {obj.user.profile.last_name}".strip()
                if name:
                    return name
            except AuthUserProfile.DoesNotExist:
                pass
        return obj.user.username if obj.user else obj.employee_code

    def get_email(self, obj):
        return obj.user.email if obj.user else ""


class EmployeeFullProfileWriteSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, max_length=150)
    email = serializers.EmailField(required=False, max_length=255)
    password = serializers.CharField(
        required=False,
        write_only=True,
        allow_blank=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )
    first_name = serializers.CharField(required=False, max_length=100)
    last_name = serializers.CharField(required=False, max_length=100)
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=20)
    profile_image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=500)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=10)
    employee_code = serializers.CharField(required=False, max_length=50)
    business_unit = serializers.PrimaryKeyRelatedField(queryset=BusinessUnitMaster.objects.all(), required=False)
    department = serializers.PrimaryKeyRelatedField(queryset=DepartmentMaster.objects.all(), required=False)
    job_role = serializers.PrimaryKeyRelatedField(queryset=JobRoleMaster.objects.all(), required=False)
    location = serializers.PrimaryKeyRelatedField(queryset=LocationMaster.objects.all(), required=False)
    manager = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeMaster.objects.all(),
        required=False,
        allow_null=True,
    )
    joining_date = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    def validate_username(self, value):
        return validate_username(value)

    def validate_email(self, value):
        return validate_email_format(value)

    def validate_password(self, value):
        if value == "":
            return ""
        return validate_password_strength(value)

    def validate_phone_number(self, value):
        if value in (None, ""):
            return None
        return validate_phone_number(value)

    def validate_profile_image_url(self, value):
        return value or None

    def validate_date_of_birth(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def validate_gender(self, value):
        if value in (None, ""):
            return None

        normalized = str(value).strip().lower()
        internal_value = GENDER_WRITE_MAP.get(normalized)
        if not internal_value:
            raise serializers.ValidationError("Gender must be one of: male, female, other.")
        return internal_value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        user = instance.user if instance else None

        if instance is None:
            required_fields = [
                "username", "email", "password",
                "first_name", "last_name", "phone_number", "employee_code",
                "business_unit", "department", "job_role", "location",
            ]
            errors = {}
            for field_name in required_fields:
                value = attrs.get(field_name)
                if value in (None, ""):
                    errors[field_name] = ["This field is required."]
            if errors:
                raise serializers.ValidationError(errors)

        username = attrs.get("username")
        if username and AuthUser.objects.filter(username=username).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError({"username": ["A user with this username already exists."]})

        email = attrs.get("email")
        if email and AuthUser.objects.filter(email=email).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError({"email": ["A user with this email already exists."]})

        employee_code = attrs.get("employee_code")
        if employee_code and EmployeeMaster.objects.filter(employee_code=employee_code).exclude(
            pk=instance.pk if instance else None
        ).exists():
            raise serializers.ValidationError({"employee_code": ["An employee with this code already exists."]})

        manager = attrs.get("manager")
        if manager and instance and manager.pk == instance.pk:
            raise serializers.ValidationError({"manager": ["An employee cannot report to themselves."]})

        return attrs


class EmployeeReportingManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeReportingManager
        fields = ["id", "employee", "manager", "relationship_type", "created_at"]
        read_only_fields = ["id", "created_at"]
