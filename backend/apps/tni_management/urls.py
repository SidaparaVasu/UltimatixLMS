from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TrainingNeedViewSet,
    SkillGapSnapshotViewSet,
    ComplianceRequirementViewSet,
    TrainingNeedApprovalViewSet,
    CourseRecommendationViewSet,
    TNIAnalysisViewSet
)

router = DefaultRouter()
router.register(r"tni-needs", TrainingNeedViewSet, basename="tni_needs")
router.register(r"gap-snapshots", SkillGapSnapshotViewSet, basename="tni_gap_snapshots")
router.register(r"compliance", ComplianceRequirementViewSet, basename="tni_compliance")
router.register(r"approvals", TrainingNeedApprovalViewSet, basename="tni_approvals")
router.register(r"recommendations", CourseRecommendationViewSet, basename="tni_recommendations")
router.register(r"analytics", TNIAnalysisViewSet, basename="tni_analytics")

urlpatterns = [
    path("", include(router.urls)),
]
