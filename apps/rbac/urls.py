from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermissionGroupViewSet, PermissionMasterViewSet

router = DefaultRouter()
router.register("permission-groups", PermissionGroupViewSet, basename="permission-groups")
router.register("permissions", PermissionMasterViewSet, basename="permissions")

urlpatterns = [
    path("", include(router.urls)),
]
