from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auth_security.models import AuthUser
from apps.core_system.models import FeatureFlag
from apps.gamification.constants import FeatureKeys


class GamificationHealthAPITest(APITestCase):
    def setUp(self):
        self.user = AuthUser.objects.create_user(
            username="gami_health@test.com",
            email="gami_health@test.com",
            password="TestPass123!",
        )
        FeatureFlag.objects.get_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"description": "Gamification module", "is_enabled": False},
        )

    def test_health_requires_auth(self):
        url = reverse("gamification-health")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_health_returns_status_payload(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-health")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        data = response.data["data"]
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["module"], "gamification")
        self.assertEqual(data["phase"], 1)
        self.assertIn("global_feature_enabled", data)
        self.assertIn("active", data)
