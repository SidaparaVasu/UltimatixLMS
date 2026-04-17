from django.test import TestCase
from django.db.models import ProtectedError
from django.utils import timezone
from datetime import timedelta
from apps.assessment_engine.models import (
    AssessmentMaster, QuestionBank, QuestionOption, 
    AssessmentQuestionMapping, AssessmentAttempt, UserAnswer
)
from apps.assessment_engine.services import AttemptService, GradingService
from apps.course_management.models import CourseCategoryMaster, CourseMaster
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, LocationMaster, JobRoleMaster, EmployeeMaster
from decimal import Decimal

class QuestionIntegrityTest(TestCase):
    def setUp(self):
        # 1. Base Org setup
        self.company = CompanyMaster.objects.create(company_name="Test Corp", company_code="TEST")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="Tech")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="QA")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="UK")
        self.role = JobRoleMaster.objects.create(job_role_name="Dev", job_role_code="DV", company=self.company)
        self.employee = EmployeeMaster.objects.create(
            employee_code="E001", company=self.company, business_unit=self.bu,
            department=self.dept, job_role=self.role, location=self.loc
        )

        # 2. Category & Course
        self.category = CourseCategoryMaster.objects.create(category_name="Eng", category_code="ENG")
        self.course = CourseMaster.objects.create(
            course_title="Testing 101", course_code="T101", 
            category=self.category, created_by=self.employee
        )

        # 3. Assessment Master
        self.assessment = AssessmentMaster.objects.create(
            title="Final Exam", course=self.course, is_randomized=True
        )

    def test_question_polymorphism(self):
        """Verify storage for different question types and scenario content."""
        # MCQ with scenario
        q_scen = QuestionBank.objects.create(
            question_text="What is the next step?",
            question_type="MCQ",
            scenario_text="A server is down in production...",
            explanation_text="Standard recovery protocol includes..."
        )
        self.assertEqual(q_scen.scenario_text, "A server is down in production...")
        
        # Descriptive
        q_desc = QuestionBank.objects.create(
            question_text="Explain recursion.",
            question_type="DESCRIPTIVE"
        )
        self.assertEqual(q_desc.question_type, "DESCRIPTIVE")

    def test_answer_shuffle_logic_shells(self):
        """Verify that randomized quizzes produce different UserAnswer shell orderings."""
        # Create 5 questions
        for i in range(5):
            q = QuestionBank.objects.create(question_text=f"Q{i}")
            AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q, display_order=i)

        service = AttemptService()
        
        # Create attempts multiple times
        orderings = []
        for _ in range(10):
            attempt = service.start_attempt(self.employee.id, self.assessment.id)
            orderings.append([a.question_id for a in attempt.answers.all().order_by('id')])
            # Cleanup for next iteration
            attempt.delete()

        unique_orderings = set(tuple(o) for o in orderings)
        # Since randomization happens at start_attempt, we expect diversity
        self.assertGreater(len(unique_orderings), 1)

    def test_orphan_protection(self):
        """Ensure QuestionBank record cannot be deleted if linked to a UserAnswer."""
        q = QuestionBank.objects.create(question_text="Permanent Question")
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q)
        
        attempt = AssessmentAttempt.objects.create(
            employee=self.employee, 
            assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Record an answer shell
        UserAnswer.objects.create(attempt=attempt, question=q, status="ATTEMPTED", answer_text="Hi")

        # Try to delete the question
        with self.assertRaises(ProtectedError):
            q.delete()

    def test_zero_weight_questions(self):
        """Ensure 0.0 point questions don't break percentage calculation."""
        q1 = QuestionBank.objects.create(question_text="Graded Q")
        q2 = QuestionBank.objects.create(question_text="Survey Q")

        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q1, weight_points=1.00)
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q2, weight_points=0.00)

        # Simulate attempt and answers
        attempt = AssessmentAttempt.objects.create(
            employee=self.employee, 
            assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        opt1 = QuestionOption.objects.create(question=q1, option_text="Correct", is_correct=True)
        ans1 = UserAnswer.objects.create(attempt=attempt, question=q1, status="ATTEMPTED")
        ans1.selected_options.add(opt1)
        
        UserAnswer.objects.create(attempt=attempt, question=q2, status="ATTEMPTED", answer_text="Feedback")

        # Grade it
        grader = GradingService()
        result = grader.grade_attempt(attempt.id)

        # Total points should be 1.0 (q1). Score should be 1.0. 100%.
        self.assertEqual(result.total_score, Decimal("1.00"))
        self.assertEqual(result.score_percentage, Decimal("100.00"))
