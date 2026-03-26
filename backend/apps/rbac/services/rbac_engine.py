from collections import defaultdict
from django.core.cache import cache
from ..models import UserRoleMaster, RolePermissionMaster
from ..constants import ScopeType


class RBACEngine:
    """
    Core engine for evaluating Role Based Access Control permissions and scopes.
    """

    @classmethod
    def get_user_permissions(cls, user):
        """
        Aggregates all permissions for a user across all assigned roles.
        
        Returns a dictionary formatted as:
        {
            "PERMISSION_CODE": {
                "GLOBAL": True | False,
                "COMPANY": [id1, id2],
                "BUSINESS_UNIT": [id1],
                "DEPARTMENT": [id1, id2],
                "SELF": True | False
            }
        }
        """
        if not user or not getattr(user, "is_authenticated", False) or not user.id:
            return {}

        cache_key = f"rbac_user_perms_{user.id}"
        cached_perms = cache.get(cache_key)
        
        if cached_perms:
            return cached_perms

        # Fetch all active role assignments for the user
        user_roles = UserRoleMaster.objects.filter(
            user=user,
            is_active=True,
            role__is_active=True
        ).select_related("role")

        aggregated_perms = defaultdict(lambda: {
            ScopeType.GLOBAL: False,
            ScopeType.COMPANY: set(),
            ScopeType.BUSINESS_UNIT: set(),
            ScopeType.DEPARTMENT: set(),
            ScopeType.SELF: False
        })

        for user_role in user_roles:
            # Fetch all permissions for this role
            role_perms = RolePermissionMaster.objects.filter(
                role=user_role.role,
                permission__is_active=True
            ).select_related("permission")

            scope_type = user_role.scope_type
            scope_id = user_role.scope_id

            for rp in role_perms:
                perm_code = rp.permission.permission_code
                
                # If they already have global access to this permission, no need to add specific IDs
                if aggregated_perms[perm_code][ScopeType.GLOBAL]:
                    continue

                if scope_type == ScopeType.GLOBAL:
                    aggregated_perms[perm_code][ScopeType.GLOBAL] = True
                    # Clear out granular scopes since GLOBAL supersedes them
                    aggregated_perms[perm_code][ScopeType.COMPANY] = set()
                    aggregated_perms[perm_code][ScopeType.BUSINESS_UNIT] = set()
                    aggregated_perms[perm_code][ScopeType.DEPARTMENT] = set()
                elif scope_type == ScopeType.SELF:
                    aggregated_perms[perm_code][ScopeType.SELF] = True
                elif scope_type in [ScopeType.COMPANY, ScopeType.BUSINESS_UNIT, ScopeType.DEPARTMENT]:
                    if scope_id is not None:
                        aggregated_perms[perm_code][scope_type].add(scope_id)

        # Convert sets to lists for easier consumption (e.g., JSON serialization if needed)
        format_perms = {}
        for perm_code, scopes in aggregated_perms.items():
            format_perms[perm_code] = {
                ScopeType.GLOBAL: scopes[ScopeType.GLOBAL],
                ScopeType.COMPANY: list(scopes[ScopeType.COMPANY]),
                ScopeType.BUSINESS_UNIT: list(scopes[ScopeType.BUSINESS_UNIT]),
                ScopeType.DEPARTMENT: list(scopes[ScopeType.DEPARTMENT]),
                ScopeType.SELF: scopes[ScopeType.SELF],
            }
            
        # Cache for 1 hour; dynamically invalidated by signals on changes
        cache.set(cache_key, format_perms, timeout=3600)
        
        return format_perms

    @classmethod
    def has_permission(cls, user, permission_code, scope_type=None, scope_id=None):
        """
        Checks if the user has specific permission.
        If scope_type and scope_id are provided, it verifies the permission exists within that scope or a higher scope (GLOBAL).
        """
        # Superusers bypass all permission checks
        # Handle unauthenticated or None users safely
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if user.is_superuser:
            return True

        user_perms = cls.get_user_permissions(user)
        
        if permission_code not in user_perms:
            return False

        perm_data = user_perms[permission_code]

        # GLOBAL scope for a permission overrides everything else
        if perm_data.get(ScopeType.GLOBAL) is True:
            return True

        # If strict scope is requested
        if scope_type and scope_id:
            if scope_type in [ScopeType.COMPANY, ScopeType.BUSINESS_UNIT, ScopeType.DEPARTMENT]:
                return scope_id in perm_data.get(scope_type, [])
            elif scope_type == ScopeType.SELF:
                return perm_data.get(ScopeType.SELF) is True

        # If no specific scope was requested but the permission exists in ANY scope
        # Usually used for simply checking if they can access a list view at all
        if not scope_type and not scope_id:
            return True

        return False
