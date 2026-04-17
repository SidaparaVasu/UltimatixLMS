from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import transaction
from apps.assessment_engine.models import AssessmentMaster
from apps.course_management.models import CourseCategoryMaster, CourseMaster, CourseSection, CourseLesson
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, LocationMaster, JobRoleMaster, EmployeeMaster


class AssessmentConfigTest(TestCase):
    def setUp(self):
        # Base setup needed for any assessment
        self.company = CompanyMaster.objects.create(company_name="Test Corp", company_code="TEST")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="Tech")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="QA")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="Remote")
        self.role = JobRoleMaster.objects.create(
            job_role_name="Quality Engineer", job_role_code="QE", company=self.company
        )
        
        self.employee = EmployeeMaster.objects.create(
            employee_code="E001", company=self.company, business_unit=self.bu,
            department=self.dept, job_role=self.role, location=self.loc
        )

        self.category = CourseCategoryMaster.objects.create(category_name="Testing", category_code="TEST")
        self.course = CourseMaster.objects.create(
            course_title="QA Fundamentals", course_code="QA101", 
            category=self.category, created_by=self.employee
        )

    def test_passing_score_boundaries(self):
        """Verify that passing percentages are restricted to [0, 100]."""
        # 1. Valid lower boundary (0%)
        quiz_0 = AssessmentMaster(title="Quiz 0", course=self.course, passing_percentage=0.00)
        quiz_0.full_clean()  # Should not raise
        
        # 2. Valid upper boundary (100%)
        quiz_100 = AssessmentMaster(title="Quiz 100", course=self.course, passing_percentage=100.00)
        quiz_100.full_clean() # Should not raise

        # 3. Invalid (negative)
        quiz_neg = AssessmentMaster(title="Quiz -1", course=self.course, passing_percentage=-1.00)
        with self.assertRaises(ValidationError):
            quiz_neg.full_clean()

        # 4. Invalid (> 100)
        quiz_over = AssessmentMaster(title="Quiz 101", course=self.course, passing_percentage=101.00)
        with self.assertRaises(ValidationError):
            quiz_over.full_clean()

    def test_time_limit_validations(self):
        """Test durations for short vs long exams."""
        # Short exam (1 min)
        quiz_short = AssessmentMaster.objects.create(title="Short", course=self.course, duration_minutes=1)
        self.assertEqual(quiz_short.duration_minutes, 1)

        # Long exam (24 hours = 1440 mins)
        quiz_long = AssessmentMaster.objects.create(title="Long", course=self.course, duration_minutes=1440)
        self.assertEqual(quiz_long.duration_minutes, 1440)

    def test_negative_marking_range(self):
        """Ensure negative marking percentage respects boundary constraints."""
        # 25% negative marking
        quiz_neg_25 = AssessmentMaster(title="Neg 25", course=self.course, negative_marking_percentage=25.00)
        quiz_neg_25.full_clean()
        
        # 100% negative marking
        quiz_neg_100 = AssessmentMaster(title="Neg 100", course=self.course, negative_marking_percentage=100.00)
        quiz_neg_100.full_clean()

        # Invalid (> 100%) - usually not allowed in grading logic
        quiz_neg_bad = AssessmentMaster(title="Neg Bad", course=self.course, negative_marking_percentage=105.00)
        with self.assertRaises(ValidationError):
            quiz_neg_bad.full_clean()

    def test_retake_logic_config(self):
        """Verify retake limit storage."""
        # No retakes allowed (Set to 1 as it includes the first attempt)
        quiz_no_retake = AssessmentMaster.objects.create(title="Strict", course=self.course, retake_limit=1)
        self.assertEqual(quiz_no_retake.retake_limit, 1)

        # Multiple retakes
        quiz_multi = AssessmentMaster.objects.create(title="Flexible", course=self.course, retake_limit=10)
        self.assertEqual(quiz_multi.retake_limit, 10)

    def test_course_vs_lesson_linking(self):
        """Verify that an assessment can be linked either to a course or a specific lesson."""
        # Course level linking (Lesson is Null)
        quiz_course = AssessmentMaster.objects.create(title="Course Final", course=self.course)
        self.assertIsNone(quiz_course.lesson)

        # Lesson level linking
        section = CourseSection.objects.create(course=self.course, section_title="Ch 1", display_order=1)
        lesson = CourseLesson.objects.create(section=section, lesson_title="Intro to QA")
        
        quiz_lesson = AssessmentMaster.objects.create(title="Module Quiz", course=self.course, lesson=lesson)
        self.assertEqual(quiz_lesson.lesson, lesson)
