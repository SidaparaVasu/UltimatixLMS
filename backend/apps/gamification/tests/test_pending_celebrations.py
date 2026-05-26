from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import AwardRuleCode, FeatureKeys, PointSourceType
from apps.gamification.models import CompanyGamificationConfig, EmployeeCelebrationAck
from apps.gamification.services import PendingCelebrationService, PointLedgerService
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


class PendingCelebrationsAPITest(APITestCase):
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
        cls.company = CompanyMaster.objects.create(company_name="Celeb Co", company_code="CEL")
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
            business_unit=bu, department_name="Dept", department_code="D1"
        )
        loc = LocationMaster.objects.create(
            company=cls.company, location_name="HQ", location_code="HQ1"
        )
        role = JobRoleMaster.objects.create(
            company=cls.company, job_role_name="Eng", job_role_code="E1"
        )

        user_model = get_user_model()
        cls.user = user_model.objects.create_user(
            username="celeb@test.com",
            email="celeb@test.com",
            password="TestPass123!",
        )
        cls.employee = EmployeeMaster.objects.create(
            employee_code="CEL001",
            user=cls.user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        learner_role = RoleMaster.objects.get(role_code="LMS_USER")
        UserRoleMaster.objects.create(
            user=cls.user,
            role=learner_role,
            scope_type=ScopeType.GLOBAL,
        )

        cls.service = PendingCelebrationService()
        cls.ledger = PointLedgerService()

    def test_first_visit_needs_baseline_without_events(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("gamification-me-pending-celebrations"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertTrue(data["needs_baseline"])
        self.assertEqual(data["events"], [])

    def test_xp_gain_after_ack_returns_pending_event(self):
        self.service.save_ack(self.employee)
        self.ledger.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=75,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=5001,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("gamification-me-pending-celebrations"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertFalse(data["needs_baseline"])
        self.assertEqual(len(data["events"]), 1)
        self.assertEqual(data["events"][0]["type"], "xp")
        self.assertEqual(data["events"][0]["amount"], 75)

    def test_ack_clears_pending(self):
        self.service.save_ack(self.employee)
        self.ledger.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=50,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=5002,
        )

        self.client.force_authenticate(user=self.user)
        ack = self.client.post(reverse("gamification-me-acknowledge-celebrations"))
        self.assertEqual(ack.status_code, status.HTTP_200_OK)
        self.assertTrue(
            EmployeeCelebrationAck.objects.filter(employee=self.employee).exists()
        )

        pending = self.client.get(reverse("gamification-me-pending-celebrations"))
        self.assertEqual(pending.data["data"]["events"], [])
