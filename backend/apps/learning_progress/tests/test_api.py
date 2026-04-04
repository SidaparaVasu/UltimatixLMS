from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.course_management.models import CourseCategoryMaster, CourseMaster, CourseSection, CourseLesson, CourseContent
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, LocationMaster, JobRoleMaster, EmployeeMaster
from apps.learning_progress.models import UserCourseEnrollment, UserLessonProgress, UserContentProgress, CourseCertificate
from django.contrib.auth import get_user_model

User = get_user_model()


class LearningProgressAPITest(APITestCase):
    def setUp(self):
        # 1. Base Setup
        self.company = CompanyMaster.objects.create(company_name="Learning Corp", company_code="LC")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="L&D")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="Admins")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="HQ")
        self.role = JobRoleMaster.objects.create(job_role_name="Student", job_role_code="ST")
        
        # 2. Two Users for Isolation Testing
        self.user_a = User.objects.create_user(username="student_a", email="a@test.com", password="password")
        self.emp_a = EmployeeMaster.objects.create(
            user=self.user_a, employee_code="STU001", company=self.company,
            business_unit=self.bu, department=self.dept, job_role=self.role, location=self.loc
        )
        
        self.user_b = User.objects.create_user(username="student_b", email="b@test.com", password="password")
        self.emp_b = EmployeeMaster.objects.create(
            user=self.user_b, employee_code="STU002", company=self.company,
            business_unit=self.bu, department=self.dept, job_role=self.role, location=self.loc
        )

        # 3. Course Hierarchy
        self.category = CourseCategoryMaster.objects.create(category_name="Testing", category_code="TEST")
        self.course = CourseMaster.objects.create(
            course_title="Progress Test", course_code="PROG01", category=self.category
        )
        self.section = CourseSection.objects.create(course=self.course, section_title="S1", display_order=1)
        self.lesson_1 = CourseLesson.objects.create(section=self.section, lesson_title="L1", display_order=1)
        self.content_1 = CourseContent.objects.create(lesson=self.lesson_1, content_type="VIDEO", display_order=1)
        self.lesson_2 = CourseLesson.objects.create(section=self.section, lesson_title="L2", display_order=2)
        self.content_2 = CourseContent.objects.create(lesson=self.lesson_2, content_type="PDF", display_order=1)

        # 4. Auth for Student A
        refresh = RefreshToken.for_user(self.user_a)
        self.access_token_a = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token_a}")

    def test_enrollment_success(self):
        """Verify that a student can successfully enroll."""
        url = reverse("my_learning-enroll")
        response = self.client.post(url, {"course_id": self.course.id})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserCourseEnrollment.objects.filter(employee=self.emp_a).count(), 1)

    def test_duplicate_enrollment_blocked(self):
        """Verify that double enrollment into the same course is rejected."""
        UserCourseEnrollment.objects.create(employee=self.emp_a, course=self.course)
        url = reverse("my_learning-enroll")
        response = self.client.post(url, {"course_id": self.course.id})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_heartbeat_sync_and_bubbling(self):
        """Verify that heartbeat updates progress and triggers completion."""
        enrollment = UserCourseEnrollment.objects.create(employee=self.emp_a, course=self.course)
        url = reverse("heartbeat-sync")
        
        # 1. Complete Lesson 1
        data = {
            "enrollment_id": enrollment.id,
            "lesson_id": self.lesson_1.id,
            "content_id": self.content_1.id,
            "playhead_seconds": 100
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Check Lesson 1 status
        lesson_progress = UserLessonProgress.objects.get(enrollment=enrollment, lesson=self.lesson_1)
        self.assertEqual(lesson_progress.status, "COMPLETED")
        
        # 2. Check Course Percentage (1 out of 2 lessons)
        enrollment.refresh_from_db()
        self.assertEqual(float(enrollment.progress_percentage), 50.00)
        
        # 3. Complete Lesson 2 -> Course Finish
        data["lesson_id"] = self.lesson_2.id
        data["content_id"] = self.content_2.id
        self.client.post(url, data)
        
        enrollment.refresh_from_db()
        self.assertEqual(float(enrollment.progress_percentage), 100.00)
        self.assertEqual(enrollment.status, "COMPLETED")

    def test_student_isolation_security(self):
        """Verify that Student A cannot access Student B's enrollment."""
        # Create enrollment for B
        enroll_b = UserCourseEnrollment.objects.create(employee=self.emp_b, course=self.course)
        
        # Try to access as A
        url = reverse("my_learning-detail", args=[enroll_b.id])
        response = self.client.get(url)
        
        # Should be 404 because get_queryset filters by self.request.user.employee
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_heartbeat_tampering_blocked(self):
        """Verify that A cannot sync heartbeats for B's enrollment."""
        enroll_b = UserCourseEnrollment.objects.create(employee=self.emp_b, course=self.course)
        url = reverse("heartbeat-sync")
        
        data = {
            "enrollment_id": enroll_b.id, # B's enrollment
            "lesson_id": self.lesson_1.id,
            "content_id": self.content_1.id,
            "playhead_seconds": 100
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
