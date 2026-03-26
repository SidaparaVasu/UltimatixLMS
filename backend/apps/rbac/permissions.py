from rest_framework import permissions
from .services.rbac_engine import RBACEngine


class HasScopedPermission(permissions.BasePermission):
    """
    Custom DRF Permission Class for evaluating RBAC permissions.
    
    Usage:
        class EmployeeMasterViewSet(viewsets.ModelViewSet):
            permission_classes = [HasScopedPermission]
            required_permission = "EMPLOYEE_MANAGEMENT"
            
    The class checks if the user has the given `required_permission` code assigned to them.
    Object-level scoping is generally handled by filtering the QuerySet via ScopedQuerySetMixin,
    so this permission primarily validates if the user is authorized to perform the action AT ALL.
    """

    def has_permission(self, request, view):
        # 1. Require authentication first
        if not request.user or not request.user.is_authenticated:
            return False

        # 2. Let superusers do whatever they want
        if request.user.is_superuser:
            return True

        # 3. Check if the view even defined a required permission
        required_permission = getattr(view, "required_permission", None)
        if not required_permission:
            # If the specific view didn't map a required_permission, 
            # either fail closed (return False) or open (return True).
            # We fail closed for security.
            return False

        # 4. Use the engine to evaluate if the user has this permission code mapped to ANY scope
        # (Granular scope bounding is handled dynamically in querysets/service logic).
        return RBACEngine.has_permission(request.user, required_permission)
