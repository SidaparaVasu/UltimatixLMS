from rest_framework import viewsets, status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, created_response, error_response
from .models import PermissionGroupMaster, PermissionMaster
from .serializers import PermissionGroupSerializer, PermissionSerializer
from .services import PermissionGroupService, PermissionService


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
