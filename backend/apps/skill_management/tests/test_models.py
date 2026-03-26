from django.test import TestCase
from django.db import IntegrityError
from apps.skill_management.models import (
    SkillCategoryMaster,
    SkillMaster,
    SkillLevelMaster,
    SkillCategorySkillMap
)

class SkillModelTest(TestCase):
    def setUp(self):
        self.category = SkillCategoryMaster.objects.create(
            category_name="Technical",
            category_code="TECH",
            description="Technical skills"
        )
        self.level = SkillLevelMaster.objects.create(
            level_name="Basic",
            level_rank=1
        )
        self.skill = SkillMaster.objects.create(
            skill_name="Python",
            skill_code="PY-01"
        )

    def test_category_creation(self):
        self.assertEqual(self.category.category_name, "Technical")
        self.assertTrue(self.category.is_active)

    def test_skill_hierarchy(self):
        child_skill = SkillMaster.objects.create(
            skill_name="Django",
            skill_code="DJ-01",
            parent_skill=self.skill
        )
        self.assertEqual(child_skill.parent_skill, self.skill)
        self.assertIn(child_skill, self.skill.child_skills.all())

    def test_unique_skill_code(self):
        with self.assertRaises(IntegrityError):
            SkillMaster.objects.create(
                skill_name="Another Python",
                skill_code="PY-01"
            )

    def test_skill_category_mapping(self):
        mapping = SkillCategorySkillMap.objects.create(
            skill=self.skill,
            category=self.category
        )
        self.assertEqual(mapping.skill, self.skill)
        self.assertEqual(mapping.category, self.category)

    def test_duplicate_mapping_error(self):
        SkillCategorySkillMap.objects.create(
            skill=self.skill,
            category=self.category
        )
        with self.assertRaises(IntegrityError):
            SkillCategorySkillMap.objects.create(
                skill=self.skill,
                category=self.category
            )

    def test_skill_level_ordering(self):
        SkillLevelMaster.objects.create(level_name="Advanced", level_rank=5)
        SkillLevelMaster.objects.create(level_name="Intermediate", level_rank=3)
        levels = list(SkillLevelMaster.objects.all().values_list('level_rank', flat=True))
        self.assertEqual(levels, [1, 3, 5])
