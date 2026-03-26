from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import UserRoleMaster, RolePermissionMaster, RoleMaster, PermissionMaster

def _invalidate_user_cache(user_id):
    cache.delete(f"rbac_user_perms_{user_id}")
    
def _invalidate_role_cache(role):
    # Find all users that possess this role and invalidate their caches
    assignments = UserRoleMaster.objects.filter(role=role)
    for assignment in assignments:
        _invalidate_user_cache(assignment.user_id)

@receiver([post_save, post_delete], sender=UserRoleMaster)
def invalidate_on_user_role_change(sender, instance, **kwargs):
    _invalidate_user_cache(instance.user_id)

@receiver([post_save, post_delete], sender=RolePermissionMaster)
def invalidate_on_role_perm_change(sender, instance, **kwargs):
    _invalidate_role_cache(instance.role)

@receiver([post_save, post_delete], sender=RoleMaster)
def invalidate_on_role_change(sender, instance, **kwargs):
    _invalidate_role_cache(instance)

@receiver([post_save, post_delete], sender=PermissionMaster)
def invalidate_on_permission_change(sender, instance, **kwargs):
    # If a permission itself changes (e.g. deactivated), invalidate ALL users attached to roles that have this permission
    mappings = RolePermissionMaster.objects.filter(permission=instance)
    for mapping in mappings:
        _invalidate_role_cache(mapping.role)
