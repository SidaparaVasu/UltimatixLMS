from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentStudioViewSet,
    AssessmentLearnerViewSet,
    QuestionBankViewSet,
    AssessmentAttemptViewSet,
    AssessmentReviewViewSet,
)

router = DefaultRouter()
router.register(r"studio", AssessmentStudioViewSet, basename="assessment_studio")
router.register(r"learner", AssessmentLearnerViewSet, basename="assessment_learner")
router.register(r"questions", QuestionBankViewSet, basename="question_bank")
router.register(r"attempts", AssessmentAttemptViewSet, basename="assessment_attempts")
router.register(r"review", AssessmentReviewViewSet, basename="assessment_review")

urlpatterns = [
    path("", include(router.urls)),
]
