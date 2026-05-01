from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
router.register(r"", NotificationViewSet, basename="notifications")

# The router generates:
#   GET    /                    → list
#   GET    /{id}/               → retrieve
#   DELETE /{id}/               → destroy
#   GET    /unread-count/       → unread_count  (extra action)
#   PATCH  /{id}/read/          → mark_read     (extra action)
#   POST   /mark-all-read/      → mark_all_read (extra action)

urlpatterns = [
    path("", include(router.urls)),
]
