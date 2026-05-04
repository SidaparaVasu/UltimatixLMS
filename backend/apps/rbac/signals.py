import logging

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _invalidate_user_cache(user_id: int) -> None:
    cache.delete(f"rbac_user_perms_{user_id}")


def _invalidate_role_users_cache(role) -> None:
    """Invalidate the permission cache for every user assigned to this role."""
    from .models import UserRoleMaster
    user_ids = UserRoleMaster.objects.filter(role=role).values_list("user_id", flat=True)
    for uid in user_ids:
        _invalidate_user_cache(uid)


def _invalidate_company_users_cache(company_id: int) -> None:
    """Invalidate the permission cache for every user whose company matches."""
    from apps.org_management.models import EmployeeMaster
    user_ids = (
        EmployeeMaster.objects
        .filter(company_id=company_id, user__isnull=False)
        .values_list("user_id", flat=True)
    )
    for uid in user_ids:
        _invalidate_user_cache(uid)


# ---------------------------------------------------------------------------
# Path 1 — UserRoleMaster change
# Fires when a role is assigned to or revoked from a user.
# ---------------------------------------------------------------------------

@receiver([post_save, post_delete], sender="rbac.UserRoleMaster")
def invalidate_on_user_role_change(sender, instance, **kwargs):
    _invalidate_user_cache(instance.user_id)


# ---------------------------------------------------------------------------
# Path 2 — RolePermissionMaster change
# Fires when a permission is added to or removed from a role.
# All users holding that role need their cache cleared.
# ---------------------------------------------------------------------------

@receiver([post_save, post_delete], sender="rbac.RolePermissionMaster")
def invalidate_on_role_perm_change(sender, instance, **kwargs):
    _invalidate_role_users_cache(instance.role)


# ---------------------------------------------------------------------------
# Path 3 — RoleMaster deactivation
# Fires when a role is soft-deleted (is_active set to False).
# ---------------------------------------------------------------------------

@receiver(post_save, sender="rbac.RoleMaster")
def invalidate_on_role_deactivation(sender, instance, **kwargs):
    if not instance.is_active:
        _invalidate_role_users_cache(instance)


# ---------------------------------------------------------------------------
# Path 3b — PermissionMaster change
# Fires when a permission is deactivated or its code changes.
# All users holding a role that maps to this permission need cache cleared.
# ---------------------------------------------------------------------------

@receiver(post_save, sender="rbac.PermissionMaster")
def invalidate_on_permission_change(sender, instance, **kwargs):
    from .models import RolePermissionMaster
    role_ids = RolePermissionMaster.objects.filter(
        permission=instance
    ).values_list("role_id", flat=True).distinct()
    from .models import RoleMaster
    for role in RoleMaster.objects.filter(id__in=role_ids):
        _invalidate_role_users_cache(role)


# ---------------------------------------------------------------------------
# Path 4 — CompanyPermissionGroup change
# Fires when a company's subscription/plan is updated.
# All users in that company need their cache cleared immediately.
# ---------------------------------------------------------------------------

@receiver([post_save, post_delete], sender="rbac.CompanyPermissionGroup")
def invalidate_on_company_permission_group_change(sender, instance, **kwargs):
    _invalidate_company_users_cache(instance.company_id)


# ---------------------------------------------------------------------------
# LMS_USER auto-assignment
# Every new employee with a linked AuthUser account gets the LMS_USER system
# role at SELF scope automatically. This gives them baseline learner access
# without any manual role assignment step.
# ---------------------------------------------------------------------------

@receiver(post_save, sender="org_management.EmployeeMaster")
def auto_assign_lms_user_role(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.user is None:
        return

    from .models import RoleMaster, UserRoleMaster
    from .constants import ScopeType

    try:
        lms_user_role = RoleMaster.objects.get(role_code="LMS_USER", is_system_role=True)
    except RoleMaster.DoesNotExist:
        logger.error(
            "auto_assign_lms_user_role: LMS_USER system role not found — "
            "ensure fixtures are loaded before creating employees. employee_id=%s",
            instance.id,
        )
        return

    UserRoleMaster.objects.get_or_create(
        user=instance.user,
        role=lms_user_role,
        scope_type=ScopeType.SELF,
        scope_id=None,
        defaults={"is_active": True},
    )
