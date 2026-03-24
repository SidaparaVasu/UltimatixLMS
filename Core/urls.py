"""
Root URL configuration.

API is fully versioned under /api/v1/.
OpenAPI docs are served at /api/v1/schema/ and /api/v1/docs/.
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # App API routes (v1)
    path("api/v1/system/", include("apps.core_system.urls")),
    path("api/v1/auth/", include("apps.auth_security.urls")),
    path("api/v1/org/", include("apps.org_management.urls")),

    # OpenAPI schema + interactive docs
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
