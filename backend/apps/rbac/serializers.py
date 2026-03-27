from rest_framework import serializers
from .models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster
)

class PermissionGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionGroupMaster
        fields = ["id", "group_name", "group_code", "description", "display_order", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionMaster
        fields = ["id", "permission_group", "permission_name", "permission_code", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class RoleMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleMaster
        fields = ["id", "role_name", "role_code", "description", "is_system_role", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "is_system_role", "created_at", "updated_at"]

class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermissionMaster
        fields = ["id", "role", "permission", "created_at"]
        read_only_fields = ["id", "created_at"]

class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.role_name", read_only=True)
    role_code = serializers.CharField(source="role.role_code", read_only=True)

    class Meta:
        model = UserRoleMaster
        fields = [
            "id", "user", "role", "role_name", "role_code", 
            "scope_type", "scope_id", "is_active", 
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "role_name", "role_code", "created_at", "updated_at"]
