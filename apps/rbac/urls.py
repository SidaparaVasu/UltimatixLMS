from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PermissionGroupViewSet,
    PermissionMasterViewSet,
    RoleMasterViewSet,
    RolePermissionViewSet
)

router = DefaultRouter()
router.register("permission-groups", PermissionGroupViewSet, basename="permission-groups")
router.register("permissions", PermissionMasterViewSet, basename="permissions")
router.register("roles", RoleMasterViewSet, basename="roles")
router.register("role-mappings", RolePermissionViewSet, basename="role-mappings")

urlpatterns = [
    path("", include(router.urls)),
]
