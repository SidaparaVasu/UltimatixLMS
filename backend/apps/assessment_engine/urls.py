from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentStudioViewSet,
    AssessmentLearnerViewSet,
    AssessmentCatalogViewSet,
    QuestionBankViewSet,
    AssessmentAttemptViewSet,
    AssessmentReviewViewSet,
    AssessmentSkillMappingViewSet,
    SkillUpgradeProposalViewSet,
)

router = DefaultRouter()
router.register(r"studio",                AssessmentStudioViewSet,        basename="assessment_studio")
router.register(r"learner",               AssessmentLearnerViewSet,       basename="assessment_learner")
router.register(r"catalog",               AssessmentCatalogViewSet,       basename="assessment_catalog")
router.register(r"questions",             QuestionBankViewSet,            basename="question_bank")
router.register(r"attempts",              AssessmentAttemptViewSet,       basename="assessment_attempts")
router.register(r"review",                AssessmentReviewViewSet,        basename="assessment_review")
router.register(r"skill-mappings",        AssessmentSkillMappingViewSet,  basename="assessment_skill_mappings")
router.register(r"skill-upgrade-proposals", SkillUpgradeProposalViewSet,  basename="skill_upgrade_proposals")

urlpatterns = [
    path("", include(router.urls)),
]
