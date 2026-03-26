from django.db.models import Q
from .services.rbac_engine import RBACEngine
from .constants import ScopeType


class ScopedQuerySetMixin:
    """
    Mixin to automatically filter viewset QuerySets based on the user's RBAC scope logic.
    
    Usage:
        class EmployeeMasterViewSet(ScopedQuerySetMixin, viewsets.ModelViewSet):
            permission_classes = [HasScopedPermission]
            required_permission = "EMPLOYEE_MANAGEMENT"
            
            # Map ScopeTypes to the ORM lookup strings for the model in the QuerySet
            scope_field_mapping = {
                ScopeType.COMPANY: "company_id__in",
                ScopeType.BUSINESS_UNIT: "business_unit_id__in",
                ScopeType.DEPARTMENT: "department_id__in",
                ScopeType.SELF: "user_id"
            }
    """

    def get_queryset(self):
        """
        Intercepts the queryset and applies Row-Level Security filters.
        """
        # Always fetch the original queryset first
        queryset = super().get_queryset()

        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()

        # Superadmins see everything
        if user.is_superuser:
            return queryset

        required_permission = getattr(self, "required_permission", None)
        if not required_permission:
            # If fail-closed logic is desired for missing config
            return queryset.none()

        user_perms = RBACEngine.get_user_permissions(user)
        perm_data = user_perms.get(required_permission, {})

        # If they have Global access for this permission, return the full queryset
        if perm_data.get(ScopeType.GLOBAL) is True:
            return queryset

        scope_mapping = getattr(self, "scope_field_mapping", {})
        if not scope_mapping:
            # If the ViewSet didn't define mappings but we reached here,
            # we shouldn't leak all data. Deny access unless GLOBAL was True.
            return queryset.none()

        # Build dynamic Q logic using `OR` operators.
        # Example logic: Show the record if it matches one of their allowed Companies,
        # OR if it matches one of their allowed Departments, OR if it's their own record.
        query_filter = Q()

        for scope_enum, orm_lookup in scope_mapping.items():
            if scope_enum == ScopeType.SELF:
                if perm_data.get(ScopeType.SELF) is True:
                    # SELF mapping usually looks for exact match with the request user ID
                    query_filter |= Q(**{orm_lookup: user.id})
                    
            elif scope_enum in [ScopeType.COMPANY, ScopeType.BUSINESS_UNIT, ScopeType.DEPARTMENT]:
                allowed_ids = perm_data.get(scope_enum, [])
                if allowed_ids:
                    # If the lookup string doesn't explicitly have __in, and it's a list, django expects __in
                    # We assume developers use __in (e.g. `department_id__in`)
                    query_filter |= Q(**{orm_lookup: allowed_ids})

        # If the query_filter is totally empty (i.e. no Q objects were appended because lists were empty)
        # the user doesn't have any matching scopes to filter this data. Result is None.
        if not query_filter:
            return queryset.none()

        return queryset.filter(query_filter).distinct()
