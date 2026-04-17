from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from apps.assessment_engine.models import (
    AssessmentMaster, QuestionBank, QuestionOption, 
    AssessmentQuestionMapping, AssessmentAttempt, UserAnswer, AssessmentResult
)
from apps.assessment_engine.services import AttemptService, GradingService
from apps.course_management.models import CourseCategoryMaster, CourseMaster
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, LocationMaster, JobRoleMaster, EmployeeMaster
from django.contrib.auth import get_user_model

User = get_user_model()


class GradingEngineTest(TestCase):
    def setUp(self):
        # Base setup
        self.user = User.objects.create_user(username="learner", email="learner@example.com", password="password")
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

        # 50% passing threshold
        self.assessment = AssessmentMaster.objects.create(
            title="Grading Test Quiz", 
            course=self.course, 
            passing_percentage=50.00,
            negative_marking_percentage=25.00 # 25% penalty
        )
        
        self.grader = GradingService()

    def test_mcq_correct_scoring(self):
        """Verify that correct MCQ answers yield full weight."""
        q = QuestionBank.objects.create(question_text="Q1", question_type="MCQ")
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q, weight_points=10.00)
        opt_correct = QuestionOption.objects.create(question=q, option_text="C", is_correct=True)

        attempt = AssessmentAttempt.objects.create(
            employee=self.employee, assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        UserAnswer.objects.create(attempt=attempt, question=q, selected_option=opt_correct)

        result = self.grader.grade_attempt(attempt.id)
        
        self.assertEqual(result.total_score, 10.00)
        self.assertEqual(result.score_percentage, 100.00)
        self.assertEqual(result.status, "PASS")

    def test_negative_marking_calculation(self):
        """Verify that incorrect answers apply the correct negative penalty."""
        q = QuestionBank.objects.create(question_text="Q1", question_type="MCQ")
        # Weight 10, Negative Marking 25% -> Penalty should be -2.5
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q, weight_points=10.00)
        opt_wrong = QuestionOption.objects.create(question=q, option_text="W", is_correct=False)

        attempt = AssessmentAttempt.objects.create(
            employee=self.employee, assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        UserAnswer.objects.create(attempt=attempt, question=q, selected_option=opt_wrong)

        result = self.grader.grade_attempt(attempt.id)
        
        # Earned points for this question should be -2.5
        self.assertEqual(result.total_score, -2.50)
        self.assertEqual(result.status, "FAIL")

    def test_manual_review_trigger(self):
        """Verify that descriptive questions set status to PENDING."""
        q_auto = QuestionBank.objects.create(question_text="MCQ", question_type="MCQ")
        q_manual = QuestionBank.objects.create(question_text="Desc", question_type="DESCRIPTIVE")

        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q_auto, weight_points=5.00)
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q_manual, weight_points=5.00)

        attempt = AssessmentAttempt.objects.create(
            employee=self.employee, assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Answer the MCQ correctly (5 pts)
        opt = QuestionOption.objects.create(question=q_auto, is_correct=True)
        UserAnswer.objects.create(attempt=attempt, question=q_auto, selected_option=opt)
        # Answer the manual one
        UserAnswer.objects.create(attempt=attempt, question=q_manual, answer_text="Some long essay...")

        result = self.grader.grade_attempt(attempt.id)
        
        self.assertEqual(result.status, "PENDING")
        self.assertEqual(result.grading_type, "PENDING")
        # Total score at this point only includes auto-graded parts (5.0)
        self.assertEqual(result.total_score, 5.00)

    def test_pass_fail_threshold(self):
        """Verify status logic based on passing_percentage."""
        # Quiz with 10 total points, 50% passing threshold (5.0 pts)
        q1 = QuestionBank.objects.create(question_text="Q1")
        q2 = QuestionBank.objects.create(question_text="Q2")
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q1, weight_points=5.00)
        AssessmentQuestionMapping.objects.create(assessment=self.assessment, question=q2, weight_points=5.00)
        
        opt1 = QuestionOption.objects.create(question=q1, is_correct=True)
        opt2_w = QuestionOption.objects.create(question=q2, is_correct=False)

        # 1. Scenerio: Exactly 50% (Pass)
        attempt_pass = AssessmentAttempt.objects.create(
            employee=self.employee, assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        UserAnswer.objects.create(attempt=attempt_pass, question=q1, selected_option=opt1)
        # We need to answer the other one wrong but no negative marking for this specific test
        self.assessment.negative_marking_percentage = 0.00
        self.assessment.save()
        UserAnswer.objects.create(attempt=attempt_pass, question=q2, selected_option=opt2_w)
        
        result = self.grader.grade_attempt(attempt_pass.id)
        self.assertEqual(result.status, "PASS")
        self.assertEqual(result.score_percentage, 50.00)

        # 2. Scenario: 49% (Fail)
        # Use cleaner math: 49 points out of 100.
        mapping1 = AssessmentQuestionMapping.objects.get(assessment=self.assessment, question=q1)
        mapping1.weight_points = 49.00
        mapping1.save()
        
        mapping2 = AssessmentQuestionMapping.objects.get(assessment=self.assessment, question=q2)
        mapping2.weight_points = 51.00 # Total = 100.00
        mapping2.save()
        
        attempt_fail = AssessmentAttempt.objects.create(
            employee=self.employee, assessment=self.assessment,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        UserAnswer.objects.create(attempt=attempt_fail, question=q1, selected_option=opt1)
        UserAnswer.objects.create(attempt=attempt_fail, question=q2, selected_option=opt2_w)

        result_fail = self.grader.grade_attempt(attempt_fail.id)
        self.assertEqual(result_fail.status, "FAIL")
        self.assertEqual(result_fail.score_percentage, 49.00)
