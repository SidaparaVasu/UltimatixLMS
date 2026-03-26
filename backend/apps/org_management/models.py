"""
org_management models.

This module defines models for organization hierarchy and employee mapping.

Tables:
    CompanyMaster              — Stores companies (multi-tenant/multi-company support)
    BusinessUnitMaster         — Stores business units within a company
    DepartmentMaster           — Stores departments within business units (supports hierarchy)
    LocationMaster             — Stores physical office locations
    JobRoleMaster              — Defines organizational job roles/designations
    EmployeeMaster             — Central employee identity and mapping
    EmployeeReportingManager   — Employee reporting hierarchy (Direct/Dotted)
"""

from django.db import models
from apps.auth_security.models import AuthUser
from .constants import EmploymentStatus, RelationshipType


# ---------------------------------------------------------------------------
# 1. CompanyMaster
# ---------------------------------------------------------------------------

class CompanyMaster(models.Model):
    """
    Stores company information for multi-company or multi-tenant support.
    """

    company_name = models.CharField(
        max_length=255,
        help_text="Full legal name of the company.",
    )
    company_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique short code for the company (e.g. OTL).",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Master on/off switch for company data across system.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_company_master"
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ["company_name"]
        indexes = [
            models.Index(fields=["company_code"], name="idx_company_master_code"),
        ]

    def __str__(self):
        return f"{self.company_name} ({self.company_code})"


# ---------------------------------------------------------------------------
# 2. BusinessUnitMaster
# ---------------------------------------------------------------------------

class BusinessUnitMaster(models.Model):
    """
    Groups departments into logical business divisions (e.g. Technology, Operations).
    """

    company = models.ForeignKey(
        CompanyMaster,
        on_delete=models.CASCADE,
        related_name="business_units",
    )
    business_unit_name = models.CharField(
        max_length=255,
        help_text="Name of the business unit.",
    )
    business_unit_code = models.CharField(
        max_length=50,
        help_text="Short code for the business unit.",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_business_unit_master"
        verbose_name = "Business Unit"
        verbose_name_plural = "Business Units"
        unique_together = ["company", "business_unit_code"]
        ordering = ["business_unit_name"]
        indexes = [
            models.Index(fields=["company"], name="idx_bu_company_id"),
            models.Index(fields=["business_unit_code"], name="idx_bu_code"),
        ]

    def __str__(self):
        return f"{self.business_unit_name} ({self.business_unit_code})"


# ---------------------------------------------------------------------------
# 3. DepartmentMaster
# ---------------------------------------------------------------------------

class DepartmentMaster(models.Model):
    """
    Sub-division within a business unit. Supports parent-child hierarchy.
    """

    business_unit = models.ForeignKey(
        BusinessUnitMaster,
        on_delete=models.CASCADE,
        related_name="departments",
    )
    department_name = models.CharField(
        max_length=255,
        help_text="Name of the department.",
    )
    department_code = models.CharField(
        max_length=50,
        help_text="Short code for the department.",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    parent_department = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sub_departments",
        help_text="Parent department if this is a sub-department.",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_department_master"
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        unique_together = ["business_unit", "department_code"]
        ordering = ["department_name"]
        indexes = [
            models.Index(fields=["business_unit"], name="idx_dept_bu_id"),
            models.Index(fields=["department_code"], name="idx_dept_code"),
            models.Index(fields=["parent_department"], name="idx_dept_parent_id"),
        ]

    def __str__(self):
        return f"{self.department_name} ({self.department_code})"


# ---------------------------------------------------------------------------
# 4. LocationMaster
# ---------------------------------------------------------------------------

class LocationMaster(models.Model):
    """
    Physical office locations / branches.
    """

    company = models.ForeignKey(
        CompanyMaster,
        on_delete=models.CASCADE,
        related_name="locations",
    )
    location_name = models.CharField(
        max_length=255,
        help_text="Name of the location / branch.",
    )
    location_code = models.CharField(
        max_length=50,
        help_text="Internal code for the branch.",
    )
    address = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="India")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_location_master"
        verbose_name = "Location"
        verbose_name_plural = "Locations"
        unique_together = ["company", "location_code"]
        ordering = ["location_name"]
        indexes = [
            models.Index(fields=["company"], name="idx_loc_company_id"),
            models.Index(fields=["location_code"], name="idx_loc_code"),
        ]

    def __str__(self):
        return f"{self.location_name} ({self.location_code})"


# ---------------------------------------------------------------------------
# 5. JobRoleMaster
# ---------------------------------------------------------------------------

class JobRoleMaster(models.Model):
    """
    Organizational designations / job titles.
    """

    job_role_name = models.CharField(
        max_length=255,
        help_text="Job role / Designation title.",
    )
    job_role_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique short code for the designation.",
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    is_active = models.BooleanField(
        default=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_job_role_master"
        verbose_name = "Job Role"
        verbose_name_plural = "Job Roles"
        ordering = ["job_role_name"]
        indexes = [
            models.Index(fields=["job_role_code"], name="idx_job_role_code"),
        ]

    def __str__(self):
        return f"{self.job_role_name} ({self.job_role_code})"


# ---------------------------------------------------------------------------
# 6. EmployeeMaster
# ---------------------------------------------------------------------------

class EmployeeMaster(models.Model):
    """
    Central employee record. Maps an AuthUser to organization entities.
    """

    user = models.ForeignKey(
        AuthUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_record",
        help_text="Link to authentication user account. Null if account is not yet created.",
    )
    employee_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique employee identifier (Employee ID).",
    )
    company = models.ForeignKey(
        CompanyMaster,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    business_unit = models.ForeignKey(
        BusinessUnitMaster,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    department = models.ForeignKey(
        DepartmentMaster,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    job_role = models.ForeignKey(
        JobRoleMaster,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    location = models.ForeignKey(
        LocationMaster,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    joining_date = models.DateField(
        null=True,
        blank=True,
    )
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.CHOICES,
        default=EmploymentStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "org_employee_master"
        verbose_name = "Employee"
        verbose_name_plural = "Employees"
        ordering = ["employee_code"]
        indexes = [
            models.Index(fields=["employee_code"], name="idx_emp_code"),
            models.Index(fields=["company"], name="idx_emp_company"),
            models.Index(fields=["department"], name="idx_emp_dept"),
            models.Index(fields=["job_role"], name="idx_emp_role"),
        ]

    def __str__(self):
        return f"Employee<{self.employee_code}>"


# ---------------------------------------------------------------------------
# 7. EmployeeReportingManager
# ---------------------------------------------------------------------------

class EmployeeReportingManager(models.Model):
    """
    Manages reporting hierarchy (organogram).
    """

    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="managers",
    )
    manager = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="subordinates",
    )
    relationship_type = models.CharField(
        max_length=20,
        choices=RelationshipType.CHOICES,
        default=RelationshipType.DIRECT,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "org_employee_reporting_manager"
        verbose_name = "Reporting Manager Mapping"
        verbose_name_plural = "Reporting Manager Mappings"
        unique_together = ["employee", "manager", "relationship_type"]
        indexes = [
            models.Index(fields=["employee"], name="idx_rep_employee_id"),
            models.Index(fields=["manager"], name="idx_rep_manager_id"),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} -> {self.manager.employee_code} ({self.relationship_type})"
