from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LearningPathViewSet,
    UserProgressViewSet,
    HeartbeatViewSet,
    CourseCertificateViewSet,
    SCORMStateView,
    SCORMCommitView,
)

router = DefaultRouter()
router.register(r"paths", LearningPathViewSet, basename="learning_paths")
router.register(r"my-learning", UserProgressViewSet, basename="my_learning")
router.register(r"heartbeat", HeartbeatViewSet, basename="heartbeat")
router.register(r"certificates", CourseCertificateViewSet, basename="certificates")

urlpatterns = [
    path("", include(router.urls)),
    # SCORM state + commit endpoints
    path(
        "scorm/state/<int:enrollment_id>/<int:content_id>/",
        SCORMStateView.as_view(),
        name="scorm-state",
    ),
    path(
        "scorm/commit/",
        SCORMCommitView.as_view(),
        name="scorm-commit",
    ),
]

