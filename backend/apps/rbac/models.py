"""
rbac models.

Tables:
    PermissionGroupMaster    — Logical groupings of permissions (e.g. LEARNER_CORE)
    PermissionMaster         — Atomic permission codes (e.g. COURSE_CREATE)
    RoleMaster               — Named containers of permissions; system roles have company=null
    RolePermissionMaster     — Many-to-many: role ↔ permission
    UserRoleMaster           — Assigns a role to a user at a given scope
    CompanyPermissionGroup   — Subscription gate: which permission groups a company has access to
"""

from django.db import models
from apps.auth_security.models import AuthUser
from .constants import ScopeType


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


# ---------------------------------------------------------------------------
# 3. RoleMaster
# ---------------------------------------------------------------------------

class RoleMaster(models.Model):
    """
    Named container of permissions.

    System roles (is_system_role=True, company=null) are shared across all tenants
    and are read-only for company admins. Custom roles (is_system_role=False) are
    owned by a specific company and are fully manageable by that company's LMS_ADMIN.
    """

    role_name = models.CharField(
        max_length=255,
        help_text="Name of the role.",
    )
    role_code = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Short code for the role. Unique globally for system roles; unique per company for custom roles.",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    is_system_role = models.BooleanField(
        default=False,
        help_text="True for platform-defined roles that cannot be edited or deleted by company admins.",
    )
    # Null for system roles (shared across all companies).
    # Non-null for custom roles created by a specific company's LMS_ADMIN.
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_roles",
        help_text="Owning company for custom roles. Null for system roles.",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rbac_role_master"
        verbose_name = "Role"
        verbose_name_plural = "Roles"
        ordering = ["role_name"]
        constraints = [
            # System roles keep their existing global uniqueness via the db_index above.
            # This constraint prevents two custom roles with the same code within one company.
            models.UniqueConstraint(
                fields=["role_code", "company"],
                condition=models.Q(company__isnull=False),
                name="uq_role_code_per_company",
            ),
        ]

    def __str__(self):
        return f"{self.role_name} ({self.role_code})"


# ---------------------------------------------------------------------------
# 4. RolePermissionMaster
# ---------------------------------------------------------------------------

class RolePermissionMaster(models.Model):
    """
    Mapping between Roles and Permissions.
    """

    role = models.ForeignKey(
        RoleMaster,
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    permission = models.ForeignKey(
        PermissionMaster,
        on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rbac_role_permission_master"
        verbose_name = "Role Permission Mapping"
        verbose_name_plural = "Role Permission Mappings"
        unique_together = ["role", "permission"]
        indexes = [
            models.Index(fields=["role"], name="idx_role_perm_role_id"),
            models.Index(fields=["permission"], name="idx_role_perm_perm_id"),
        ]

    def __str__(self):
        return f"{self.role.role_code} -> {self.permission.permission_code}"


# ---------------------------------------------------------------------------
# 5. UserRoleMaster
# ---------------------------------------------------------------------------

class UserRoleMaster(models.Model):
    """
    Assigns a role to a user within a specific scope.
    """

    user = models.ForeignKey(
        AuthUser,
        on_delete=models.CASCADE,
        related_name="user_roles",
    )
    role = models.ForeignKey(
        RoleMaster,
        on_delete=models.CASCADE,
        related_name="user_assignments",
    )
    scope_type = models.CharField(
        max_length=50,
        choices=ScopeType.CHOICES,
        default=ScopeType.GLOBAL,
        help_text="The boundary where this role applies (e.g., GLOBAL, DEPARTMENT).",
    )
    scope_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="The ID of the scope entity (e.g., Department ID). Null if scope is GLOBAL or SELF.",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rbac_user_role_master"
        verbose_name = "User Role Assignment"
        verbose_name_plural = "User Role Assignments"
        unique_together = ["user", "role", "scope_type", "scope_id"]
        indexes = [
            models.Index(fields=["user"], name="idx_user_role_user_id"),
            models.Index(fields=["role"], name="idx_user_role_role_id"),
            models.Index(fields=["scope_type", "scope_id"], name="idx_user_role_scope"),
        ]

    def __str__(self):
        scope_str = f"{self.scope_type}"
        if self.scope_id:
            scope_str += f" ({self.scope_id})"
        return f"{self.user.email} - {self.role.role_code} [{scope_str}]"



# ---------------------------------------------------------------------------
# 6. CompanyPermissionGroup
# ---------------------------------------------------------------------------

class CompanyPermissionGroup(models.Model):
    """
    Subscription gate: records which PermissionGroupMaster entries a company
    has been granted access to.

    The RBACEngine reads this table when building a user's permission map and
    excludes any permission whose group is not present here (with is_active=True)
    for the user's company. Deactivating a record takes effect on the next
    cache refresh — no role changes are needed.

    Managed by superusers via Django Admin only.
    """

    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="permission_groups",
    )
    permission_group = models.ForeignKey(
        PermissionGroupMaster,
        on_delete=models.CASCADE,
        related_name="company_grants",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rbac_company_permission_group"
        verbose_name = "Company Permission Group"
        verbose_name_plural = "Company Permission Groups"
        unique_together = [("company", "permission_group")]
        indexes = [
            models.Index(fields=["company"], name="idx_cpg_company_id"),
            models.Index(fields=["permission_group"], name="idx_cpg_group_id"),
        ]

    def __str__(self):
        status = "active" if self.is_active else "inactive"
        return f"{self.company.company_code} → {self.permission_group.group_code} [{status}]"
