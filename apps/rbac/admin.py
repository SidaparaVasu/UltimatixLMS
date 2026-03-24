from django.contrib import admin
from .models import PermissionGroupMaster, PermissionMaster


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
