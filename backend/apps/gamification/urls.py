from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.gamification.views import (
    GamificationHealthAPIView,
    LeaderboardViewSet,
    MeGamificationViewSet,
)

router = DefaultRouter()
router.register(r"me", MeGamificationViewSet, basename="gamification-me")
router.register(r"leaderboard", LeaderboardViewSet, basename="gamification-leaderboard")

urlpatterns = [
    path("health/", GamificationHealthAPIView.as_view(), name="gamification-health"),
    path("", include(router.urls)),
]
