from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIRequestFactory
from apps.auth_security.models import AuthUser
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, EmployeeMaster

from ..models import (
    RoleMaster,
    PermissionGroupMaster,
    PermissionMaster,
    RolePermissionMaster,
    UserRoleMaster,
)
from ..constants import ScopeType
from ..mixins import ScopedQuerySetMixin


class MockBaseViewSet:
    def get_queryset(self):
        return EmployeeMaster.objects.all()


class MockEmployeeViewSet(ScopedQuerySetMixin, MockBaseViewSet):
    """
    A mock viewset attempting to emulate an Employee endpoint. 
    It leverages ScopedQuerySetMixin to lock down the query automatically.
    """
    required_permission = "EMPLOYEE_VIEW"
    scope_field_mapping = {
        ScopeType.COMPANY: "company_id__in",
        ScopeType.DEPARTMENT: "department_id__in",
        ScopeType.SELF: "user_id"
    }

    def __init__(self, request):
        self.request = request


class MockDangerViewSet(ScopedQuerySetMixin, MockBaseViewSet):
    """
    A view missing scope_field_mapping config to test fail-closed logic.
    """
    required_permission = "EMPLOYEE_VIEW"
    
    def __init__(self, request):
        self.request = request


class TestScopedQuerySetMixin(TestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()

        # Database Entity Structure
        self.user1 = AuthUser.objects.create_user(username="u1", email="u1@test.com", password="pwd")
        self.user2 = AuthUser.objects.create_user(username="u2", email="u2@test.com", password="pwd")
        self.user3 = AuthUser.objects.create_user(username="u3", email="u3@test.com", password="pwd")

        self.c1 = CompanyMaster.objects.create(company_name="Company 1", company_code="C1")
        self.c2 = CompanyMaster.objects.create(company_name="Company 2", company_code="C2")

        self.bu1 = BusinessUnitMaster.objects.create(company=self.c1, business_unit_name="BU1", business_unit_code="B1")
        self.bu2 = BusinessUnitMaster.objects.create(company=self.c2, business_unit_name="BU2", business_unit_code="B2")

        self.d1 = DepartmentMaster.objects.create(business_unit=self.bu1, department_name="HR", department_code="D1")
        self.d2 = DepartmentMaster.objects.create(business_unit=self.bu1, department_name="IT", department_code="D2")
        self.d3 = DepartmentMaster.objects.create(business_unit=self.bu2, department_name="Sales", department_code="D3")

        # EmployeeMaster requires JobRole and Location
        from apps.org_management.models import JobRoleMaster, LocationMaster
        self.role_m = JobRoleMaster.objects.create(job_role_name="Dev", job_role_code="DEV")
        self.loc_m = LocationMaster.objects.create(company=self.c1, location_name="HQ", location_code="HQ")
        self.loc_m2 = LocationMaster.objects.create(company=self.c2, location_name="HQ2", location_code="HQ2")

        # 3 Employees
        self.emp1 = EmployeeMaster.objects.create(
            user=self.user1, company=self.c1, business_unit=self.bu1, department=self.d1, 
            job_role=self.role_m, location=self.loc_m, employee_code="E1"
        )
        self.emp2 = EmployeeMaster.objects.create(
            user=self.user2, company=self.c1, business_unit=self.bu1, department=self.d2, 
            job_role=self.role_m, location=self.loc_m, employee_code="E2"
        )
        self.emp3 = EmployeeMaster.objects.create(
            user=self.user3, company=self.c2, business_unit=self.bu2, department=self.d3, 
            job_role=self.role_m, location=self.loc_m2, employee_code="E3"
        )

        # RBAC Structure
        perm_group = PermissionGroupMaster.objects.create(group_name="Test", group_code="TEST")
        self.perm_view = PermissionMaster.objects.create(permission_group=perm_group, permission_name="View Emp", permission_code="EMPLOYEE_VIEW")

        self.role = RoleMaster.objects.create(role_name="Manager", role_code="MGR")
        RolePermissionMaster.objects.create(role=self.role, permission=self.perm_view)

    def tearDown(self):
        cache.clear()

    def _get_mock_request(self, user):
        request = self.factory.get("/")
        request.user = user
        return request

    def test_mixin_global_access(self):
        """Verify GLOBAL scope overrides all filters and returns the entire DB table."""
        UserRoleMaster.objects.create(user=self.user1, role=self.role, scope_type=ScopeType.GLOBAL)
        
        view = MockEmployeeViewSet(request=self._get_mock_request(self.user1))
        # Call the mixin's get_queryset
        queryset = ScopedQuerySetMixin.get_queryset(view)
        
        # User has GLOBAL, should see all 3 employees
        self.assertEqual(queryset.count(), 3)

    def test_mixin_granular_filtering_company(self):
        """Verify scope isolates exactly the allowed entity keys (Company scoping)."""
        # Give User 1 rights to Company 1 ONLY
        UserRoleMaster.objects.create(user=self.user1, role=self.role, scope_type=ScopeType.COMPANY, scope_id=self.c1.id)
        
        view = MockEmployeeViewSet(request=self._get_mock_request(self.user1))
        queryset = ScopedQuerySetMixin.get_queryset(view)
        
        # Should see emp1 and emp2 (both belong to C1) but not emp3 (belongs to C2)
        self.assertEqual(queryset.count(), 2)
        self.assertIn(self.emp1, queryset)
        self.assertIn(self.emp2, queryset)

    def test_mixin_granular_filtering_department(self):
        """Verify scope isolates exactly the allowed entity keys (Department scoping)."""
        # Give User 1 rights to Department 2 ONLY
        UserRoleMaster.objects.create(user=self.user1, role=self.role, scope_type=ScopeType.DEPARTMENT, scope_id=self.d2.id)
        
        view = MockEmployeeViewSet(request=self._get_mock_request(self.user1))
        queryset = ScopedQuerySetMixin.get_queryset(view)
        
        # Should ONLY see emp2
        self.assertEqual(queryset.count(), 1)
        self.assertEqual(queryset.first(), self.emp2)

    def test_mixin_self_scoping(self):
        """Verify that falling back to SELF limits query to records where request.user matches the record's user_id."""
        # Grant SELF rights
        UserRoleMaster.objects.create(user=self.user3, role=self.role, scope_type=ScopeType.SELF)

        view = MockEmployeeViewSet(request=self._get_mock_request(self.user3))
        queryset = ScopedQuerySetMixin.get_queryset(view)

        # Should strictly only see own record! (Emp 3)
        self.assertEqual(queryset.count(), 1)
        self.assertEqual(queryset.first(), self.emp3)

    def test_mixin_no_mapping_failsafe(self):
        """Verify ViewSets missing the dictionary mapping return an empty response for Granular users."""
        UserRoleMaster.objects.create(user=self.user1, role=self.role, scope_type=ScopeType.COMPANY, scope_id=self.c1.id)
        
        # Use a view without scope mapping config provided!
        view = MockDangerViewSet(request=self._get_mock_request(self.user1))
        queryset = ScopedQuerySetMixin.get_queryset(view)

        # Should fail closed to 0 items to prevent accidental data leakage
        self.assertEqual(queryset.count(), 0)

    def test_mixin_no_permissions(self):
        """Verify a user with 0 permissions gets an empty queryset."""
        # user2 has no mappings
        view = MockEmployeeViewSet(request=self._get_mock_request(self.user2))
        queryset = ScopedQuerySetMixin.get_queryset(view)
        self.assertEqual(queryset.count(), 0)
