from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch
from django.contrib.auth import get_user_model


User = get_user_model()


class TNIRBACTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.normal_user = User.objects.create_user(
            username="analyst", password="password", email="analyst@test.com"
        )
        self.client.force_authenticate(user=self.normal_user)

    @patch('apps.rbac.services.rbac_engine.RBACEngine.has_permission')
    def test_permission_denied_without_tni_manage(self, mock_has_permission):
        """
        Scenario: Normal user tries to access TNI Needs list but lacks TNI_MANAGE permission.
        """
        mock_has_permission.return_value = False
        response = self.client.get("/api/v1/tni/tni-needs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.rbac.services.rbac_engine.RBACEngine.has_permission')
    def test_permission_granted_with_tni_manage(self, mock_has_permission):
        """
        Scenario: Normal user with correct permission code accesses TNI Needs list.
        """
        mock_has_permission.return_value = True
        response = self.client.get("/api/v1/tni/tni-needs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('apps.rbac.services.rbac_engine.RBACEngine.has_permission')
    def test_restricted_action_permission(self, mock_has_permission):
        """
        Scenario: User has TNI_VIEW but tries to trigger gap analysis (requires TNI_MANAGE).
        """
        def side_effect(user, code):
            if code == "TNI_MANAGE": return False
            if code == "TNI_VIEW": return True
            return False

        mock_has_permission.side_effect = side_effect
        
        # Triggering gap analysis requires TNI_MANAGE on TrainingNeedViewSet
        url = "/api/v1/tni/tni-needs/run-gap-analysis/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify call was made for TNI_MANAGE
        mock_has_permission.assert_any_call(self.normal_user, "TNI_MANAGE")
