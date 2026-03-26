from django.test import TestCase
from apps.skill_management.models import (
    SkillMaster,
    SkillLevelMaster,
    EmployeeSkill,
    EmployeeSkillHistory
)
from apps.org_management.models import (
    EmployeeMaster, 
    CompanyMaster, 
    DepartmentMaster, 
    BusinessUnitMaster, 
    JobRoleMaster,
    LocationMaster
)

class SkillSignalTest(TestCase):
    def setUp(self):
        # Setup foundation for Employee
        self.company = CompanyMaster.objects.create(company_name="Test Company", company_code="TC-01")
        self.bu = BusinessUnitMaster.objects.create(
            business_unit_name="Test BU", business_unit_code="BU-01", company=self.company
        )
        self.dept = DepartmentMaster.objects.create(
            department_name="Test Dept", department_code="TD-01", business_unit=self.bu
        )
        self.job_role = JobRoleMaster.objects.create(
            job_role_name="Test Job Role", job_role_code="TD-01"
        )
        self.location = LocationMaster.objects.create(
            location_name="Test Loc", location_code="TL-01", company=self.company
        )
        self.employee = EmployeeMaster.objects.create(
            employee_code="EMP-01",
            company=self.company,
            business_unit=self.bu,
            department=self.dept,
            job_role=self.job_role,
            location=self.location
        )
        self.skill = SkillMaster.objects.create(
            skill_name="Python", skill_code="PY-01"
        )
        self.level_basic = SkillLevelMaster.objects.create(
            level_name="Basic", level_rank=1
        )
        self.level_intermediate = SkillLevelMaster.objects.create(
            level_name="Intermediate", level_rank=3
        )

    def test_initial_skill_assignment_history(self):
        """
        Verify that history is generated on new assignment.
        """
        EmployeeSkill.objects.create(
            employee=self.employee,
            skill=self.skill,
            current_level=self.level_basic
        )
        history = EmployeeSkillHistory.objects.filter(employee=self.employee, skill=self.skill)
        self.assertEqual(history.count(), 1)
        self.assertIsNone(history.first().old_level)
        self.assertEqual(history.first().new_level, self.level_basic)

    def test_skill_upgrade_history(self):
        """
        Verify that history is generated when level changes.
        """
        emp_skill = EmployeeSkill.objects.create(
            employee=self.employee,
            skill=self.skill,
            current_level=self.level_basic
        )
        # Update level
        emp_skill.current_level = self.level_intermediate
        emp_skill.save()
        
        history = EmployeeSkillHistory.objects.filter(employee=self.employee, skill=self.skill).order_by('-changed_at')
        self.assertEqual(history.count(), 2)
        latest = history.first()
        self.assertEqual(latest.old_level, self.level_basic)
        self.assertEqual(latest.new_level, self.level_intermediate)

    def test_nop_optimization_logic(self):
        """
        Verify no history is created if level remains unchanged.
        """
        emp_skill = EmployeeSkill.objects.create(
            employee=self.employee,
            skill=self.skill,
            current_level=self.level_basic
        )
        initial_history_count = EmployeeSkillHistory.objects.count()
        # Save without changes
        emp_skill.save()
        self.assertEqual(EmployeeSkillHistory.objects.count(), initial_history_count)
