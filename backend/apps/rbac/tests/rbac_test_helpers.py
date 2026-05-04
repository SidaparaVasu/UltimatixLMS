"""
Shared test helpers for RBAC tests.

The RBACEngine subscription gate requires:
  1. An EmployeeMaster record linking the user to a company.
  2. At least one active CompanyPermissionGroup for that company covering
     the permission group being tested.

Any test that exercises RBACEngine.get_user_permissions() for a non-superuser
must call setup_subscription_gate() for each user it wants to receive a
non-empty permission map.
"""

from apps.org_management.models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    JobRoleMaster,
    LocationMaster,
    EmployeeMaster,
)
from apps.rbac.models import CompanyPermissionGroup


_emp_counter = 0


def setup_subscription_gate(user, perm_group, company=None):
    """
    Creates the minimal org + subscription records so that RBACEngine
    returns a non-empty permission map for *user* when they hold a role
    whose permissions belong to *perm_group*.

    Returns (company, employee) for further use in the test.
    """
    global _emp_counter

    if company is None:
        company, _ = CompanyMaster.objects.get_or_create(
            company_code="TEST_CO",
            defaults={"company_name": "Test Company"},
        )

    # Grant the permission group to the company
    CompanyPermissionGroup.objects.get_or_create(
        company=company,
        permission_group=perm_group,
        defaults={"is_active": True},
    )

    # Create minimal org hierarchy if not already present
    bu, _ = BusinessUnitMaster.objects.get_or_create(
        company=company,
        business_unit_code="TEST_BU",
        defaults={"business_unit_name": "Test BU"},
    )
    dept, _ = DepartmentMaster.objects.get_or_create(
        business_unit=bu,
        department_code="TEST_DEPT",
        defaults={"department_name": "Test Dept"},
    )
    job_role, _ = JobRoleMaster.objects.get_or_create(
        company=company,
        job_role_code="TEST_JR",
        defaults={"job_role_name": "Test Role"},
    )
    location, _ = LocationMaster.objects.get_or_create(
        company=company,
        location_code="TEST_LOC",
        defaults={"location_name": "Test Location"},
    )

    # Each user needs a unique employee_code
    _emp_counter += 1
    employee, _ = EmployeeMaster.objects.get_or_create(
        user=user,
        defaults={
            "company": company,
            "business_unit": bu,
            "department": dept,
            "job_role": job_role,
            "location": location,
            "employee_code": f"TEST_EMP_{_emp_counter:04d}",
        },
    )

    return company, employee
