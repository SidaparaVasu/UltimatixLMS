"""
rbac models.

This module defines models for Role Based Access Control,
including Permission Groups, Permissions, Roles, and Role assignments.
"""

from django.db import models


# ---------------------------------------------------------------------------
# 1. PermissionGroupMaster
# ---------------------------------------------------------------------------

class PermissionGroupMaster(models.Model):
    """
    Logically groups permissions together (e.g., 'Course Management', 'User Management').
    """

    group_name = models.CharField(
        max_length=255,
        help_text="Name of the permission group.",
    )
    group_code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique short code for the permission group.",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    display_order = models.IntegerField(
        default=0,
        help_text="Order in which this group appears in the UI.",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rbac_permission_group_master"
        verbose_name = "Permission Group"
        verbose_name_plural = "Permission Groups"
        ordering = ["display_order", "group_name"]

    def __str__(self):
        return f"{self.group_name} ({self.group_code})"


# ---------------------------------------------------------------------------
# 2. PermissionMaster
# ---------------------------------------------------------------------------

class PermissionMaster(models.Model):
    """
    Atomic permissions defining a single action (e.g., 'COURSE_CREATE').
    """

    permission_group = models.ForeignKey(
        PermissionGroupMaster,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    permission_name = models.CharField(
        max_length=255,
        help_text="Human-readable name of the permission.",
    )
    permission_code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique exact permission string evaluated in code (e.g., USER_DELETE).",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rbac_permission_master"
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"
        ordering = ["permission_group__display_order", "permission_name"]
        indexes = [
            models.Index(fields=["permission_code"], name="idx_perm_code"),
            models.Index(fields=["permission_group"], name="idx_perm_group_id"),
        ]

    def __str__(self):
        return f"{self.permission_name} [{self.permission_code}]"
