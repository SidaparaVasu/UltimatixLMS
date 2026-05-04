from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db import models as django_models

from common.response import success_response, created_response, error_response
from common.exceptions import PermissionDeniedException
from .models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster,
    CompanyPermissionGroup,
)
from .serializers import (
    PermissionGroupSerializer,
    PermissionSerializer,
    RoleMasterSerializer,
    RolePermissionSerializer,
    UserRoleSerializer,
    CompanyPermissionGroupSerializer,
)
from .services import (
    PermissionGroupService,
    PermissionService,
    RoleService,
    RolePermissionService,
    UserRoleService,
    CompanyPermissionGroupService,
)
from .permission_codes import P


# ---------------------------------------------------------------------------
# Helper: resolve the requesting user's company via EmployeeMaster
# ---------------------------------------------------------------------------

def _get_request_company(request):
    """
    Returns the CompanyMaster for the requesting user, or None if the user
    has no linked EmployeeMaster record.
    """
    from apps.org_management.models import EmployeeMaster
    employee = (
        EmployeeMaster.objects
        .filter(user=request.user)
        .select_related("company")
        .first()
    )
    return employee.company if employee else None


# ---------------------------------------------------------------------------
# Base ViewSet
# ---------------------------------------------------------------------------

class BaseRBACViewSet(viewsets.ModelViewSet):
    """
    Standardises CRUD responses and delegates to services.
    All subclasses inherit IsAuthenticated from the DRF default permission class.
    """
    service_class = None

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(**serializer.validated_data)
        return created_response(
            message=f"{self.model.__name__} created successfully.",
            data=self.get_serializer(instance).data,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, partial=False, **serializer.validated_data)
        return success_response(
            message=f"{self.model.__name__} updated successfully.",
            data=self.get_serializer(updated).data,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, partial=True, **serializer.validated_data)
        return success_response(
            message=f"{self.model.__name__} partially updated successfully.",
            data=self.get_serializer(updated).data,
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(name="soft_delete", type=bool, description="Set to false for hard delete (default is true)")
        ]
    )
    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        soft_delete = request.query_params.get("soft_delete", "true").lower() == "true"
        self.service_class().delete(pk=pk, soft_delete=soft_delete)
        return success_response(message=f"{self.model.__name__} deleted successfully.")


# ---------------------------------------------------------------------------
# Permission Group — read-only for all company-admin roles
# ---------------------------------------------------------------------------

class PermissionGroupViewSet(BaseRBACViewSet):
    queryset = PermissionGroupMaster.objects.all()
    serializer_class = PermissionGroupSerializer
    service_class = PermissionGroupService
    model = PermissionGroupMaster
    http_method_names = ["get", "head", "options"]


# ---------------------------------------------------------------------------
# Permission Master — read-only for all company-admin roles
# ---------------------------------------------------------------------------

class PermissionMasterViewSet(BaseRBACViewSet):
    queryset = PermissionMaster.objects.all()
    serializer_class = PermissionSerializer
    service_class = PermissionService
    model = PermissionMaster
    http_method_names = ["get", "head", "options"]


# ---------------------------------------------------------------------------
# Role Master — company-scoped with system role immutability
# ---------------------------------------------------------------------------

class RoleMasterViewSet(BaseRBACViewSet):
    queryset = RoleMaster.objects.all()
    serializer_class = RoleMasterSerializer
    service_class = RoleService
    model = RoleMaster
    required_permission = P.SYSTEM_ADMINISTRATION.ROLE_VIEW

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return RoleMaster.objects.all()
        company = _get_request_company(self.request)
        if not company:
            return RoleMaster.objects.none()
        # System roles (company=null) are visible to all; custom roles only for own company
        return RoleMaster.objects.filter(
            django_models.Q(is_system_role=True) | django_models.Q(company=company)
        )

    def create(self, request, *args, **kwargs):
        company = _get_request_company(request)
        if not company and not request.user.is_superuser:
            return error_response(
                message="Cannot resolve company for this user.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            instance = self.service_class().create_custom_role(
                company=company,
                requesting_user=request.user,
                **serializer.validated_data,
            )
        except PermissionDeniedException as exc:
            return error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return error_response(message=str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        return created_response(
            message="Role created successfully.",
            data=self.get_serializer(instance).data,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_role and not request.user.is_superuser:
            return error_response(
                message="System roles are read-only.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_role and not request.user.is_superuser:
            return error_response(
                message="System roles are read-only.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_role:
            return error_response(
                message="System roles cannot be deleted.",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @extend_schema(responses={200: PermissionSerializer(many=True)})
    @action(detail=True, methods=["post"], url_path="assign-permissions")
    def assign_permissions(self, request, pk=None):
        """Bulk-assigns permissions to a role with privilege escalation check."""
        permission_ids = request.data.get("permission_ids", [])
        ok, message = self.service_class().assign_permissions(
            role_id=pk,
            permission_ids=permission_ids,
            requesting_user=request.user,
        )
        if not ok:
            return error_response(message=message, status_code=status.HTTP_403_FORBIDDEN)
        return success_response(message=message)

    @action(detail=True, methods=["get"], url_path="permissions")
    def get_role_permissions(self, request, pk=None):
        """Returns all permissions currently mapped to this role."""
        role_perms = self.service_class().get_role_permissions(role_id=pk)
        if role_perms is None:
            return error_response(message="Role not found.", status_code=status.HTTP_404_NOT_FOUND)
        serializer = PermissionSerializer([m.permission for m in role_perms], many=True)
        return success_response(data=serializer.data)


# ---------------------------------------------------------------------------
# Role Permission Mapping
# ---------------------------------------------------------------------------

class RolePermissionViewSet(BaseRBACViewSet):
    queryset = RolePermissionMaster.objects.all()
    serializer_class = RolePermissionSerializer
    service_class = RolePermissionService
    model = RolePermissionMaster


# ---------------------------------------------------------------------------
# User Role Assignment — company-scoped
# ---------------------------------------------------------------------------

class UserRoleViewSet(BaseRBACViewSet):
    queryset = UserRoleMaster.objects.all()
    serializer_class = UserRoleSerializer
    service_class = UserRoleService
    model = UserRoleMaster
    required_permission = P.SYSTEM_ADMINISTRATION.USER_ROLE_ASSIGN

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            qs = UserRoleMaster.objects.all().select_related("user", "role")
        else:
            company = _get_request_company(self.request)
            if not company:
                return UserRoleMaster.objects.none()
            # Only assignments for users who belong to the same company
            qs = UserRoleMaster.objects.filter(
                user__employee_record__company=company
            ).select_related("user", "role")

        # Optional ?user=<id> filter — used by UserRoleAssignmentPanel
        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            from apps.auth_security.models import AuthUser
            target_user = AuthUser.objects.get(pk=serializer.validated_data["user"].pk)
            role = serializer.validated_data["role"]
            scope_type = serializer.validated_data["scope_type"]
            scope_id = serializer.validated_data.get("scope_id")
            instance = self.service_class().assign_role(
                requesting_user=request.user,
                target_user=target_user,
                role=role,
                scope_type=scope_type,
                scope_id=scope_id,
            )
        except PermissionDeniedException as exc:
            return error_response(message=str(exc), status_code=status.HTTP_403_FORBIDDEN)
        return created_response(
            message="Role assigned successfully.",
            data=self.get_serializer(instance).data,
        )


# ---------------------------------------------------------------------------
# Company Permission Group — superuser only (subscription management)
# ---------------------------------------------------------------------------

class CompanyPermissionGroupViewSet(BaseRBACViewSet):
    """
    Manages which permission groups a company has been granted.
    Only accessible by Django superusers — this is a platform-level operation.
    """
    queryset = CompanyPermissionGroup.objects.all().select_related("company", "permission_group")
    serializer_class = CompanyPermissionGroupSerializer
    service_class = CompanyPermissionGroupService
    model = CompanyPermissionGroup

    def get_permissions(self):
        return [permissions.IsAdminUser()]


# ---------------------------------------------------------------------------
# My Permissions — returns the subscription-gated permission map for the caller
# ---------------------------------------------------------------------------

class MyPermissionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .services.rbac_engine import RBACEngine
        perm_map = RBACEngine.get_user_permissions(request.user)
        return success_response(
            message="User permissions retrieved successfully.",
            data=perm_map,
        )
