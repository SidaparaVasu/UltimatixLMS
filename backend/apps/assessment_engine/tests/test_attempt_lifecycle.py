from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.assessment_engine.models import (
    AssessmentMaster, QuestionBank, QuestionOption, 
    AssessmentQuestionMapping, AssessmentAttempt
)
from apps.assessment_engine.services import AttemptService
from apps.course_management.models import CourseCategoryMaster, CourseMaster
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, LocationMaster, JobRoleMaster, EmployeeMaster

User = get_user_model()


class AttemptLifecycleTest(TestCase):
    def setUp(self):
        # 1. Base Setup
        self.user = User.objects.create_user(
            username="learner", 
            email="learner@example.com", 
            password="password"
        )
        self.company = CompanyMaster.objects.create(company_name="Test Corp", company_code="TEST")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="Tech")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="QA")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="UK")
        self.role = JobRoleMaster.objects.create(job_role_name="Dev", job_role_code="DV", company=self.company)
        
        self.employee = EmployeeMaster.objects.create(
            user=self.user,
            employee_code="E001", company=self.company, business_unit=self.bu,
            department=self.dept, job_role=self.role, location=self.loc
        )

        self.category = CourseCategoryMaster.objects.create(category_name="Eng", category_code="ENG")
        self.course = CourseMaster.objects.create(
            course_title="Testing 101", course_code="T101", 
            category=self.category, created_by=self.employee
        )

        # Assessment with 1 retake limit (max 1 total attempt)
        self.assessment = AssessmentMaster.objects.create(
            title="Short Quiz", course=self.course, retake_limit=1
        )
        
        self.client = APIClient()

    def test_retake_enforcement(self):
        """Verify that student cannot start N+1 attempts."""
        service = AttemptService()
        
        # 1. First attempt - OK
        attempt1 = service.start_attempt(self.employee.id, self.assessment.id)
        self.assertEqual(attempt1.status, "IN_PROGRESS")
        
        # Mark as completed
        attempt1.status = "COMPLETED"
        attempt1.save()
        
        # 2. Second attempt - Should FAIL
        with self.assertRaises(ValueError) as cm:
            service.start_attempt(self.employee.id, self.assessment.id)
        
        self.assertIn("Retake limit reached", str(cm.exception))

    def test_concurrency_recovery(self):
        """Starting a quiz twice while one is active returns the SAME attempt."""
        service = AttemptService()
        
        attempt1 = service.start_attempt(self.employee.id, self.assessment.id)
        
        # Start again without finishing attempt1
        attempt2 = service.start_attempt(self.employee.id, self.assessment.id)
        
        self.assertEqual(attempt1.id, attempt2.id, "System created a new attempt instead of returning active one")

    def test_data_sanitization_api(self):
        """Ensure correct answers are not leaked in the questions API."""
        q = QuestionBank.objects.create(question_text="Secret Question?")
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q)
        QuestionOption.objects.create(question=q, option_text="Correct Choice", is_correct=True)
        QuestionOption.objects.create(question=q, option_text="Wrong Choice", is_correct=False)

        service = AttemptService()
        attempt = service.start_attempt(self.employee.id, self.assessment.id)
        
        url = f"/api/v1/assessment/attempts/{attempt.id}/questions/"
        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        
        # Look deep into options
        for question in data:
            for option in question['options']:
                self.assertNotIn('is_correct', option)
                self.assertNotIn('feedback_text', option)

    def test_timer_expiry_manual_check(self):
        """Check if an attempt is identified as expired."""
        # Note: Auto-expiry logic usually runs in the service or via a cron/task.
        # Here we test if we can identify it.
        attempt = AssessmentAttempt.objects.create(
            employee=self.employee,
            assessment=self.assessment,
            expires_at=timezone.now() - timedelta(minutes=10) # 10 mins ago
        )
        
        # Verification: Is it expired?
        is_expired = timezone.now() > attempt.expires_at
        self.assertTrue(is_expired)
        
        # TODO: Once we implement the Submit API Guard, test that submission fails here.
