from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import FeatureKeys
from apps.gamification.models import BadgeDefinition, CompanyGamificationConfig, EmployeeBadge
from apps.gamification.services import BadgeEvaluator
from apps.learning_progress.constants import ProgressStatus
from apps.learning_progress.models import UserCourseEnrollment
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
    JobRoleMaster,
    LocationMaster,
)
from apps.rbac.constants import ScopeType
from apps.rbac.models import (
    CompanyPermissionGroup,
    PermissionGroupMaster,
    RoleMaster,
    UserRoleMaster,
)


class BadgeEvaluatorTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        call_command("loaddata", "initial_badge_definitions", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(company_name="Badge Co", company_code="BDG")
        CompanyGamificationConfig.objects.create(company=cls.company, is_enabled=True)

        bu = BusinessUnitMaster.objects.create(
            company=cls.company, business_unit_name="BU", business_unit_code="BU1"
        )
        dept = DepartmentMaster.objects.create(
            business_unit=bu, department_name="Dept", department_code="D1"
        )
        loc = LocationMaster.objects.create(
            company=cls.company, location_name="HQ", location_code="HQ1"
        )
        role = JobRoleMaster.objects.create(
            company=cls.company, job_role_name="Eng", job_role_code="E1"
        )
        user = get_user_model().objects.create_user(
            username="badge.eval@test.com",
            email="badge.eval@test.com",
            password="TestPass123!",
        )
        cls.employee = EmployeeMaster.objects.create(
            employee_code="BDG001",
            user=user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        cls.evaluator = BadgeEvaluator()

    def test_first_course_badge_on_completion(self):
        from apps.course_management.models import CourseCategoryMaster, CourseMaster

        category = CourseCategoryMaster.objects.create(
            category_name="General",
            category_code="GEN-BDG",
        )
        course = CourseMaster.objects.create(
            course_title="Intro",
            course_code="INTRO-BDG",
            category=category,
            created_by=self.employee,
        )
        UserCourseEnrollment.objects.create(
            employee=self.employee,
            course=course,
            status=ProgressStatus.COMPLETED,
        )
        self.evaluator.evaluate_for_employee(self.employee)
        self.assertEqual(
            EmployeeBadge.objects.filter(
                employee=self.employee,
                badge__code="FIRST_COURSE",
            ).count(),
            1,
        )

    def test_badge_not_awarded_twice(self):
        badge = BadgeDefinition.objects.get(code="FIRST_COURSE")
        EmployeeBadge.objects.create(
            employee=self.employee,
            company=self.company,
            badge=badge,
        )
        new_badges = self.evaluator.evaluate_for_employee(self.employee)
        codes = [b.code for b in new_badges]
        self.assertNotIn("FIRST_COURSE", codes)
        self.assertEqual(
            EmployeeBadge.objects.filter(employee=self.employee, badge=badge).count(),
            1,
        )


class BadgeAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        call_command("loaddata", "initial_badge_definitions", verbosity=0)
        call_command("loaddata", "01_permission_groups", verbosity=0)
        call_command("loaddata", "02_permissions", verbosity=0)
        call_command("loaddata", "03_system_roles", verbosity=0)
        call_command("loaddata", "04_role_permissions", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(company_name="Badge API", company_code="BDGA")
        CompanyGamificationConfig.objects.create(company=cls.company, is_enabled=True)
        CompanyPermissionGroup.objects.create(
            company=cls.company,
            permission_group=PermissionGroupMaster.objects.get(group_code="GAMIFICATION"),
            is_active=True,
        )

        bu = BusinessUnitMaster.objects.create(
            company=cls.company, business_unit_name="BU", business_unit_code="BU1"
        )
        dept = DepartmentMaster.objects.create(
            business_unit=bu, department_name="D", department_code="D1"
        )
        loc = LocationMaster.objects.create(
            company=cls.company, location_name="HQ", location_code="HQ1"
        )
        role = JobRoleMaster.objects.create(
            company=cls.company, job_role_name="Eng", job_role_code="E1"
        )
        user = get_user_model().objects.create_user(
            username="badge.api@test.com",
            email="badge.api@test.com",
            password="TestPass123!",
        )
        cls.employee = EmployeeMaster.objects.create(
            employee_code="BDGA01",
            user=user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        UserRoleMaster.objects.create(
            user=user,
            role=RoleMaster.objects.get(role_code="LMS_USER"),
            scope_type=ScopeType.GLOBAL,
        )

    def test_catalog_returns_all_badges(self):
        self.client.force_authenticate(user=self.employee.user)
        response = self.client.get(reverse("gamification-badges-catalog"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        self.assertEqual(response.data["data"]["count"], 27)
        self.assertEqual(len(results), 27)
        self.assertFalse(any(row["is_earned"] for row in results))

    def test_me_badges_lists_earned_only(self):
        badge = BadgeDefinition.objects.get(code="FIRST_COURSE")
        EmployeeBadge.objects.create(
            employee=self.employee,
            company=self.company,
            badge=badge,
        )
        self.client.force_authenticate(user=self.employee.user)
        response = self.client.get(reverse("gamification-me-badges"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["code"], "FIRST_COURSE")

    def test_summary_reflects_badge_count(self):
        badge = BadgeDefinition.objects.get(code="FIRST_PASS")
        EmployeeBadge.objects.create(
            employee=self.employee,
            company=self.company,
            badge=badge,
        )
        self.client.force_authenticate(user=self.employee.user)
        response = self.client.get(reverse("gamification-me-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["badges_count"], 1)
