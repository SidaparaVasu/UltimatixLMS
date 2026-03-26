from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.skill_management.models import (
    SkillCategoryMaster, 
    SkillMaster, 
    SkillLevelMaster
)

User = get_user_model()

class SkillAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.superuser = User.objects.create_superuser(
            username="admin", password="password", email="admin@test.com"
        )
        self.client.force_authenticate(user=self.superuser)
        self.category = SkillCategoryMaster.objects.create(
            category_name="Leadership", category_code="LEAD"
        )
        self.skill = SkillMaster.objects.create(
            skill_name="Management", skill_code="MGMT"
        )
        self.level = SkillLevelMaster.objects.create(
            level_name="Advanced", level_rank=4
        )

    def test_list_skill_categories(self):
        response = self.client.get("/api/v1/skills/skill-categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated response structure: data -> { results: [...], count: 1, ... }
        self.assertIn('results', response.data['data'])
        self.assertEqual(len(response.data['data']['results']), 1)

    def test_create_skill(self):
        payload = {
            "skill_name": "New Skill",
            "skill_code": "NEW-01",
            "description": "Test description"
        }
        response = self.client.post("/api/v1/skills/skills/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SkillMaster.objects.count(), 2)

    def test_skill_detail_recursive(self):
        """
        Check that child skills are returned in the detail view.
        """
        child = SkillMaster.objects.create(
            skill_name="Sub-Skill",
            skill_code="SUB-01",
            parent_skill=self.skill
        )
        response = self.client.get(f"/api/v1/skills/skills/{self.skill.id}/")
        # Ensure detail view uses SkillDetailSerializer
        self.assertIn('child_skills', response.data['data'])
        self.assertEqual(len(response.data['data']['child_skills']), 1)

    def test_soft_delete(self):
        response = self.client.delete(f"/api/v1/skills/skills/{self.skill.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Refresh from DB
        self.skill.refresh_from_db()
        self.assertFalse(self.skill.is_active)

    def test_hard_delete_param(self):
        response = self.client.delete(f"/api/v1/skills/skills/{self.skill.id}/?soft_delete=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(SkillMaster.objects.filter(id=self.skill.id).exists())
