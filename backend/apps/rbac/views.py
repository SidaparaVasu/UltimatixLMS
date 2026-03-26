from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, created_response, error_response
from .models import (
    PermissionGroupMaster,
    PermissionMaster,
    RoleMaster,
    RolePermissionMaster,
    UserRoleMaster
)
from .serializers import (
    PermissionGroupSerializer,
    PermissionSerializer,
    RoleMasterSerializer,
    RolePermissionSerializer,
    UserRoleSerializer
)
from .services import (
    PermissionGroupService,
    PermissionService,
    RoleService,
    RolePermissionService,
    UserRoleService
)


class BaseRBACViewSet(viewsets.ModelViewSet):
    """
    Base viewset for RBAC modules.
    Standardizes responses and deletion logic.
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
            data=self.get_serializer(instance).data
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_instance = self.service_class().update(pk=instance.pk, partial=False, **serializer.validated_data)
        return success_response(
            message=f"{self.model.__name__} updated successfully.",
            data=self.get_serializer(updated_instance).data
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = self.service_class().update(pk=instance.pk, partial=True, **serializer.validated_data)
        return success_response(
            message=f"{self.model.__name__} partially updated successfully.",
            data=self.get_serializer(updated_instance).data
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
        msg = f"{self.model.__name__} {'soft-deleted' if soft_delete else 'hard-deleted'} successfully."
        return success_response(message=msg)


class PermissionGroupViewSet(BaseRBACViewSet):
    queryset = PermissionGroupMaster.objects.all()
    serializer_class = PermissionGroupSerializer
    service_class = PermissionGroupService
    model = PermissionGroupMaster


class PermissionMasterViewSet(BaseRBACViewSet):
    queryset = PermissionMaster.objects.all()
    serializer_class = PermissionSerializer
    service_class = PermissionService
    model = PermissionMaster


class RoleMasterViewSet(BaseRBACViewSet):
    queryset = RoleMaster.objects.all()
    serializer_class = RoleMasterSerializer
    service_class = RoleService
    model = RoleMaster

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system_role:
            return error_response(
                message="Cannot delete a system-defined role.",
                status_code=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @extend_schema(responses={200: RolePermissionSerializer(many=True)})
    @action(detail=True, methods=["post"], url_path="assign-permissions")
    def assign_permissions(self, request, pk=None):
        """
        Accepts a list of mission_ids and maps them to the role.
        Replaces current mappings with the provided list.
        """
        role = self.get_object()
        permission_ids = request.data.get("permission_ids", [])
        
        # Verify permissions exist
        permissions = PermissionMaster.objects.filter(id__in=permission_ids)
        if len(permissions) != len(permission_ids):
             return error_response(message="One or more permission IDs are invalid.", status_code=status.HTTP_400_BAD_REQUEST)

        # Bulk update strategy: Clear and re-create for simplicity
        RolePermissionMaster.objects.filter(role=role).delete()
        mappings = [RolePermissionMaster(role=role, permission=p) for p in permissions]
        RolePermissionMaster.objects.bulk_create(mappings)

        return success_response(message="Permissions assigned successfully.")

    @action(detail=True, methods=["get"], url_path="permissions")
    def get_role_permissions(self, request, pk=None):
        """Returns all permissions currently assigned to this role."""
        role = self.get_object()
        mappings = RolePermissionMaster.objects.filter(role=role).select_related("permission")
        serializer = PermissionSerializer([m.permission for m in mappings], many=True)
        return success_response(data=serializer.data)


class RolePermissionViewSet(BaseRBACViewSet):
    queryset = RolePermissionMaster.objects.all()
    serializer_class = RolePermissionSerializer
    service_class = RolePermissionService
    model = RolePermissionMaster


class UserRoleViewSet(BaseRBACViewSet):
    queryset = UserRoleMaster.objects.all()
    serializer_class = UserRoleSerializer
    service_class = UserRoleService
    model = UserRoleMaster


class MyPermissionsAPIView(APIView):
    """
    Returns the aggregated permissions and scopes for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Fetch active role assignments for the current user
        user_roles = UserRoleMaster.objects.filter(
            user=request.user, 
            is_active=True
        ).select_related("role")
        
        permissions_data = []
        for ur in user_roles:
            # For each role, fetch its associated permissions
            role_perms = RolePermissionMaster.objects.filter(
                role=ur.role
            ).select_related("permission")
            
            for rp in role_perms:
                permissions_data.append({
                    "permission_code": rp.permission.permission_code,
                    "permission_name": rp.permission.permission_name,
                    "scope_type": ur.scope_type,
                    "scope_id": ur.scope_id
                })
        
        return success_response(
            message="User permissions retrieved successfully.",
            data=permissions_data
        )
