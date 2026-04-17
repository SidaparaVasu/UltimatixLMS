from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentStudioViewSet, 
    QuestionBankViewSet, 
    AssessmentAttemptViewSet
)

router = DefaultRouter()
router.register(r"studio", AssessmentStudioViewSet, basename="assessment_studio")
router.register(r"questions", QuestionBankViewSet, basename="question_bank")
router.register(r"attempts", AssessmentAttemptViewSet, basename="assessment_attempts")

urlpatterns = [
    path("", include(router.urls)),
]
