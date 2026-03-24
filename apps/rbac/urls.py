from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PermissionGroupViewSet,
    PermissionMasterViewSet,
    RoleMasterViewSet,
    RolePermissionViewSet,
    UserRoleViewSet,
    MyPermissionsAPIView
)

router = DefaultRouter()
router.register("permission-groups", PermissionGroupViewSet, basename="permission-groups")
router.register("permissions", PermissionMasterViewSet, basename="permissions")
router.register("roles", RoleMasterViewSet, basename="roles")
router.register("role-mappings", RolePermissionViewSet, basename="role-mappings")
router.register("user-assignments", UserRoleViewSet, basename="user-assignments")

urlpatterns = [
    path("", include(router.urls)),
    path("my-permissions/", MyPermissionsAPIView.as_view(), name="my-permissions"),
]
