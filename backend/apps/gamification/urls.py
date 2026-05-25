from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.gamification.views import (
    BadgeGamificationViewSet,
    GamificationConfigAPIView,
    GamificationHealthAPIView,
    GamificationRulesViewSet,
    LeaderboardViewSet,
    MeGamificationViewSet,
    TeamGamificationViewSet,
)

router = DefaultRouter()
router.register(r"me", MeGamificationViewSet, basename="gamification-me")
router.register(r"badges", BadgeGamificationViewSet, basename="gamification-badges")
router.register(r"leaderboard", LeaderboardViewSet, basename="gamification-leaderboard")
router.register(r"team", TeamGamificationViewSet, basename="gamification-team")
router.register(r"rules", GamificationRulesViewSet, basename="gamification-rules")

urlpatterns = [
    path("health/", GamificationHealthAPIView.as_view(), name="gamification-health"),
    path("config/", GamificationConfigAPIView.as_view(), name="gamification-config"),
    path("", include(router.urls)),
]
