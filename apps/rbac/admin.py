from django.contrib import admin
from .models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster
)


@admin.register(PermissionGroupMaster)
class PermissionGroupMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "group_name", "group_code", "display_order", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["group_name", "group_code"]
    ordering = ["display_order", "group_name"]


@admin.register(PermissionMaster)
class PermissionMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "permission_name", "permission_code", "permission_group", "is_active", "created_at"]
    list_filter = ["is_active", "permission_group"]
    search_fields = ["permission_name", "permission_code"]
    ordering = ["permission_group__display_order", "permission_name"]


@admin.register(RoleMaster)
class RoleMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "role_name", "role_code", "is_system_role", "is_active", "created_at"]
    list_filter = ["is_system_role", "is_active"]
    search_fields = ["role_name", "role_code"]
    ordering = ["role_name"]


@admin.register(RolePermissionMaster)
class RolePermissionMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "role", "permission", "created_at"]
    list_filter = ["role"]
    search_fields = ["role__role_name", "permission__permission_name"]


@admin.register(UserRoleMaster)
class UserRoleMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "role", "scope_type", "scope_id", "is_active", "created_at"]
    list_filter = ["scope_type", "is_active", "role"]
    search_fields = ["user__email", "user__username", "role__role_code"]
    ordering = ["-created_at"]

