"""
Root URL configuration.

API is fully versioned under /api/v1/.
OpenAPI docs are served at /api/v1/schema/ and /api/v1/docs/.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
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
    path("api/v1/rbac/", include("apps.rbac.urls")),
    path("api/v1/skills/", include("apps.skill_management.urls")),
    path("api/v1/tni/", include("apps.tni_management.urls")),
    path("api/v1/planning/", include("apps.training_planning.urls")),
    path("api/v1/courses/", include("apps.course_management.urls")),
    path("api/v1/learning/", include("apps.learning_progress.urls")),
    path("api/v1/files/", include("apps.file_management.urls")),
    path("api/v1/assessment/", include("apps.assessment_engine.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/certificates/", include("apps.certificate_management.urls")),
    path("api/v1/gamification/", include("apps.gamification.urls")),

    # OpenAPI schema + interactive docs
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve extracted SCORM package files in development only.
# In production, point Nginx or CloudFront directly at MEDIA_ROOT/scorm/
# (or the S3 bucket prefix) — never let Django serve these in prod.
if settings.DEBUG:
    import os
    from django.views.static import serve

    scorm_root = os.path.join(settings.MEDIA_ROOT, getattr(settings, 'SCORM_STORAGE_PREFIX', 'scorm'))
    serve_path = getattr(settings, 'SCORM_SERVE_PATH', 'scorm-content')

    urlpatterns += [
        path(
            f"{serve_path}/<path:path>",
            serve,
            {'document_root': scorm_root},
        ),
    ]

