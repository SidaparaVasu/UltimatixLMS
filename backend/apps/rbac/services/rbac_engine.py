from collections import defaultdict
from django.conf import settings
from django.core.cache import cache
from ..models import UserRoleMaster, RolePermissionMaster
from ..constants import ScopeType


class RBACEngine:
    """
    Builds and caches the effective permission map for a user.

    The map shape is:
        {
            "PERMISSION_CODE": {
                "GLOBAL": bool,
                "COMPANY": [company_id, ...],
                "BUSINESS_UNIT": [bu_id, ...],
                "DEPARTMENT": [dept_id, ...],
                "SELF": bool,
            }
        }

    Subscription gate: permissions whose PermissionGroupMaster is not in the
    company's active CompanyPermissionGroup records are excluded from the map,
    even if a role technically carries them. This lets us control feature access
    at the company level without touching role assignments.

    Query budget on a cache miss: exactly 3 DB queries.
    Query budget on a cache hit: 0 DB queries.
    """

    @classmethod
    def _get_cache_ttl(cls) -> int:
        return getattr(settings, "RBAC_CACHE_TTL", 3600)

    @classmethod
    def get_user_permissions(cls, user) -> dict:
        if not user or not getattr(user, "is_authenticated", False) or not user.id:
            return {}

        # Superusers bypass the permission map entirely — has_permission handles this.
        if user.is_superuser:
            return {}

        cache_key = f"rbac_user_perms_{user.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # Query 1: resolve the user's company via EmployeeMaster
        from apps.org_management.models import EmployeeMaster
        employee = (
            EmployeeMaster.objects
            .filter(user=user)
            .select_related("company")
            .first()
        )
        if not employee:
            cache.set(cache_key, {}, timeout=cls._get_cache_ttl())
            return {}

        # Query 2: load the permission group codes this company has been granted
        from ..models import CompanyPermissionGroup
        granted_group_codes = set(
            CompanyPermissionGroup.objects
            .filter(company=employee.company, is_active=True)
            .values_list("permission_group__group_code", flat=True)
        )

        # Query 3: fetch all active role assignments and their permissions in one pass
        user_roles = UserRoleMaster.objects.filter(
            user=user,
            is_active=True,
            role__is_active=True,
        ).select_related("role")

        role_ids = [ur.role_id for ur in user_roles]
        scope_by_role = {ur.role_id: (ur.scope_type, ur.scope_id) for ur in user_roles}

        all_role_perms = RolePermissionMaster.objects.filter(
            role_id__in=role_ids,
            permission__is_active=True,
        ).select_related("permission__permission_group")

        aggregated = defaultdict(lambda: {
            ScopeType.GLOBAL:        False,
            ScopeType.COMPANY:       set(),
            ScopeType.BUSINESS_UNIT: set(),
            ScopeType.DEPARTMENT:    set(),
            ScopeType.SELF:          False,
        })

        for rp in all_role_perms:
            perm = rp.permission

            # Subscription gate: skip permissions whose group the company hasn't been granted
            if perm.permission_group.group_code not in granted_group_codes:
                continue

            perm_code = perm.permission_code
            scope_type, scope_id = scope_by_role[rp.role_id]

            if aggregated[perm_code][ScopeType.GLOBAL]:
                continue

            if scope_type == ScopeType.GLOBAL:
                aggregated[perm_code][ScopeType.GLOBAL] = True
                aggregated[perm_code][ScopeType.COMPANY] = set()
                aggregated[perm_code][ScopeType.BUSINESS_UNIT] = set()
                aggregated[perm_code][ScopeType.DEPARTMENT] = set()
            elif scope_type == ScopeType.SELF:
                aggregated[perm_code][ScopeType.SELF] = True
            elif scope_type in (ScopeType.COMPANY, ScopeType.BUSINESS_UNIT, ScopeType.DEPARTMENT):
                if scope_id is not None:
                    aggregated[perm_code][scope_type].add(scope_id)

        result = {
            code: {
                ScopeType.GLOBAL:        scopes[ScopeType.GLOBAL],
                ScopeType.COMPANY:       list(scopes[ScopeType.COMPANY]),
                ScopeType.BUSINESS_UNIT: list(scopes[ScopeType.BUSINESS_UNIT]),
                ScopeType.DEPARTMENT:    list(scopes[ScopeType.DEPARTMENT]),
                ScopeType.SELF:          scopes[ScopeType.SELF],
            }
            for code, scopes in aggregated.items()
        }

        cache.set(cache_key, result, timeout=cls._get_cache_ttl())
        return result

    @classmethod
    def has_permission(cls, user, permission_code, scope_type=None, scope_id=None) -> bool:
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if user.is_superuser:
            return True

        user_perms = cls.get_user_permissions(user)

        if permission_code not in user_perms:
            return False

        perm_data = user_perms[permission_code]

        if perm_data.get(ScopeType.GLOBAL) is True:
            return True

        if scope_type and scope_id:
            if scope_type in (ScopeType.COMPANY, ScopeType.BUSINESS_UNIT, ScopeType.DEPARTMENT):
                return scope_id in perm_data.get(scope_type, [])
            if scope_type == ScopeType.SELF:
                return perm_data.get(ScopeType.SELF) is True

        # No specific scope requested — permission exists in at least one scope
        if not scope_type and not scope_id:
            return True

        return False
