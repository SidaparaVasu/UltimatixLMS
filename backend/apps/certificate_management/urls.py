"""
Certificate Management URL configuration.

All routes are mounted under /api/v1/certificates/ in Core/urls.py.

Final resolved routes:
    GET   /                              → IssuedCertificateViewSet.list
    GET   /:id/                          → IssuedCertificateViewSet.retrieve
    GET   /my/                           → IssuedCertificateViewSet.my_certificates
    GET   /:id/download/                 → IssuedCertificateViewSet.download
    POST  /:id/revoke/                   → IssuedCertificateViewSet.revoke
    GET   /verify/:certificate_id/       → IssuedCertificateViewSet.verify
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import IssuedCertificateViewSet

router = DefaultRouter()
router.register(r"", IssuedCertificateViewSet, basename="certificates")

urlpatterns = [
    path("", include(router.urls)),
]
