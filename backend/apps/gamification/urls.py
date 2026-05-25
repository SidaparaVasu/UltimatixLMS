from django.urls import path

from apps.gamification.views import GamificationHealthAPIView

urlpatterns = [
    path("health/", GamificationHealthAPIView.as_view(), name="gamification-health"),
]
