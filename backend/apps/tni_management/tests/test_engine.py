from django.test import TestCase
from apps.org_management.models import (
    CompanyMaster, BusinessUnitMaster, DepartmentMaster, 
    JobRoleMaster, EmployeeMaster, LocationMaster
)
from apps.skill_management.models import SkillMaster, SkillLevelMaster, JobRoleSkillRequirement, EmployeeSkill
from apps.tni_management.models import TrainingNeed, SkillGapSnapshot
from apps.tni_management.services import TNIEngineService
from apps.tni_management.constants import TNISourceType, TNIPriority, TNIStatus


class TNIEngineTest(TestCase):
    def setUp(self):
        # 1. Base Org Setup
        self.company = CompanyMaster.objects.create(company_name="Test Co", company_code="TCO")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="Tech")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="Backend")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="HQ")
        self.role = JobRoleMaster.objects.create(job_role_name="Backend Dev", job_role_code="BDEV")
        
        self.employee = EmployeeMaster.objects.create(
            employee_code="E001",
            company=self.company,
            business_unit=self.bu,
            department=self.dept,
            job_role=self.role,
            location=self.loc
        )

        # 2. Skill & Levels
        self.lvl1 = SkillLevelMaster.objects.create(level_name="Basic", level_rank=1)
        self.lvl2 = SkillLevelMaster.objects.create(level_name="Intermediate", level_rank=2)
        self.lvl3 = SkillLevelMaster.objects.create(level_name="Advanced", level_rank=3)
        self.lvl4 = SkillLevelMaster.objects.create(level_name="Expert", level_rank=4)

        self.python = SkillMaster.objects.create(skill_name="Python", skill_code="PY")
        self.docker = SkillMaster.objects.create(skill_name="Docker", skill_code="DK")

        # 3. Requirements: Backend Dev needs Python level 4
        self.req_py = JobRoleSkillRequirement.objects.create(
            job_role=self.role,
            skill=self.python,
            required_level=self.lvl4
        )
        # Backend Dev needs Docker level 2
        self.req_dk = JobRoleSkillRequirement.objects.create(
            job_role=self.role,
            skill=self.docker,
            required_level=self.lvl2
        )

    def test_gap_analysis_standard_scenario(self):
        """
        Standard Case: Employee has Python level 2 (Intermediate) but role requires 4 (Expert).
        Gap = 2 levels.
        """
        # Employee possesses level 2
        EmployeeSkill.objects.create(
            employee=self.employee,
            skill=self.python,
            current_level=self.lvl2
        )

        service = TNIEngineService()
        result = service.analyze_employee_gaps(self.employee.id)

        # Verify results
        self.assertEqual(len(result), 2) # Python (gap) and Docker (missing entirely)
        
        # Check Python identification
        py_need = TrainingNeed.objects.filter(employee=self.employee, skill=self.python).first()
        self.assertIsNotNone(py_need)
        self.assertEqual(py_need.priority, TNIPriority.HIGH) # Gap is 2
        self.assertEqual(py_need.source_type, TNISourceType.SKILL_GAP)

        # Check Snapshot
        snapshot = SkillGapSnapshot.objects.filter(employee=self.employee, skill=self.python).first()
        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot.gap_value, 2)
        self.assertEqual(snapshot.current_level, self.lvl2)

    def test_skill_zero_missing_case(self):
        """
        Missing Case: Employee has no record for a required skill.
        """
        service = TNIEngineService()
        service.analyze_employee_gaps(self.employee.id)

        # Docker requirement was rank 2, employee has 0. Gap = 2.
        dk_need = TrainingNeed.objects.filter(employee=self.employee, skill=self.docker).first()
        self.assertIsNotNone(dk_need)
        self.assertEqual(dk_need.priority, TNIPriority.HIGH)

    def test_no_gap_scenario(self):
        """
        Exceeds Case: Employee has rank 4, role requires rank 4. No gap.
        """
        EmployeeSkill.objects.create(
            employee=self.employee,
            skill=self.python,
            current_level=self.lvl4
        )
        EmployeeSkill.objects.create(
            employee=self.employee,
            skill=self.docker,
            current_level=self.lvl2
        )

        service = TNIEngineService()
        result = service.analyze_employee_gaps(self.employee.id)

        self.assertEqual(len(result), 0)
        self.assertEqual(TrainingNeed.objects.count(), 0)

    def test_update_existing_need(self):
        """
        Verify that re-running calculation updates the existing record instead of duplicating.
        """
        service = TNIEngineService()
        
        # Run 1
        service.analyze_employee_gaps(self.employee.id)
        self.assertEqual(TrainingNeed.objects.count(), 2)

        # Run 2
        service.analyze_employee_gaps(self.employee.id)
        self.assertEqual(TrainingNeed.objects.count(), 2) # Should still be 2
