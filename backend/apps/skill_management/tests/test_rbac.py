from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch
from django.contrib.auth import get_user_model
from apps.skill_management.models import SkillMaster

User = get_user_model()

class SkillRBACTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.normal_user = User.objects.create_user(
            username="analyst", password="password", email="analyst@test.com"
        )
        self.client.force_authenticate(user=self.normal_user)
        self.skill = SkillMaster.objects.create(
            skill_name="Mastery", skill_code="MASTER"
        )

    @patch('apps.rbac.services.rbac_engine.RBACEngine.has_permission')
    def test_permission_denied_without_proper_code(self, mock_has_permission):
        """
        Scenario: Normal user tries to access a restricted skill endpoint.
        Verify that HasScopedPermission denies it when the code is missing.
        """
        mock_has_permission.return_value = False
        response = self.client.get("/api/v1/skills/skills/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.rbac.services.rbac_engine.RBACEngine.has_permission')
    def test_permission_granted_with_proper_code(self, mock_has_permission):
        """
        Scenario: User is assigned the correct permission code.
        Verify that the ViewSet endpoint allows access.
        """
        # Ensure the mock accepts the user and the correct required_permission
        mock_has_permission.return_value = True
        response = self.client.get("/api/v1/skills/skills/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_superuser_always_allowed(self):
        """
        Verify that is_superuser bypasses RBAC permission checks.
        """
        superuser = User.objects.create_superuser(
            username="root", password="password", email="root@test.com"
        )
        self.client.force_authenticate(user=superuser)
        # Note: No patch needed, because HasScopedPermission checks is_superuser first.
        response = self.client.get("/api/v1/skills/skills/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('apps.rbac.services.rbac_engine.RBACEngine.has_permission')
    def test_restricted_permission_code_check(self, mock_has_permission):
        """
        Verify that the ViewSet requires the correct specific permission code.
        """
        # Scenario: User has 'GENERAL' permission but not 'SKILL_MANAGE'.
        def side_effect(user, code):
            if code == "SKILL_MANAGE": return False
            return True

        mock_has_permission.side_effect = side_effect
        response = self.client.get("/api/v1/skills/skills/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify call was made with the correct code defined on the SkillMasterViewSet
        mock_has_permission.assert_called_with(self.normal_user, "SKILL_MANAGE")
