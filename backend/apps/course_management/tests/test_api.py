from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.course_management.models import (
    CourseCategoryMaster, CourseMaster, CourseSection, CourseLesson, 
    CourseContent, CourseDiscussionThread, CourseDiscussionReply
)
from apps.org_management.models import CompanyMaster, BusinessUnitMaster, DepartmentMaster, LocationMaster, JobRoleMaster, EmployeeMaster
from apps.rbac.models import PermissionGroupMaster, RoleMaster, UserRoleMaster, PermissionMaster, RolePermissionMaster
from django.contrib.auth import get_user_model

User = get_user_model()


class CourseAPITest(APITestCase):
    def setUp(self):
        # 1. Base Setup
        self.company = CompanyMaster.objects.create(company_name="Test Corp", company_code="TC")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="Tech")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="Backend")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="UK")
        self.role = JobRoleMaster.objects.create(job_role_name="Dev", job_role_code="DV")
        self.user = User.objects.create_user(
            username="testuser", 
            email="test@example.com", 
            password="password"
        )
        self.employee = EmployeeMaster.objects.create(
            user=self.user, employee_code="E001", company=self.company,
            business_unit=self.bu, department=self.dept, job_role=self.role, location=self.loc
        )

        # 2. RBAC Setup
        self.perm_group = PermissionGroupMaster.objects.create(group_name="Courses", group_code="CRS")
        self.lms_role = RoleMaster.objects.create(role_name="Lms Student", role_code="STUDENT")
        self.perm_view = PermissionMaster.objects.create(
            permission_group=self.perm_group,
            permission_name="View Courses", 
            permission_code="COURSE_VIEW"
        )
        # Added forum perms for the tests
        self.perm_forum = PermissionMaster.objects.create(
            permission_group=self.perm_group,
            permission_name="Contribute Forum", 
            permission_code="COURSE_FORUM_CONTRIBUTE"
        )
        RolePermissionMaster.objects.create(role=self.lms_role, permission=self.perm_view)
        RolePermissionMaster.objects.create(role=self.lms_role, permission=self.perm_forum)
        UserRoleMaster.objects.create(user=self.user, role=self.lms_role)

        # 3. Hierarchy Setup
        self.category = CourseCategoryMaster.objects.create(category_name="Programming", category_code="PROG")
        self.course = CourseMaster.objects.create(
            course_title="Python Deep Dive", course_code="PYDIVE", 
            category=self.category, difficulty_level="INTERMEDIATE"
        )
        self.section = CourseSection.objects.create(course=self.course, section_title="Part 1: Variables", display_order=1)
        self.lesson = CourseLesson.objects.create(section=self.section, lesson_title="Intro", display_order=1)
        self.content = CourseContent.objects.create(lesson=self.lesson, content_type="VIDEO", display_order=1)

        # 4. JWT Auth
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_nested_course_retrieval(self):
        """Verify that retrieve() returns the full content hierarchy."""
        url = reverse("courses-detail", args=[self.course.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(data["course_title"], "Python Deep Dive")
        self.assertEqual(len(data["sections"]), 1)

    def test_empty_course_retrieval(self):
        """Verify that a course without sections returns correctly."""
        other_cat = CourseCategoryMaster.objects.create(category_name="Other", category_code="OTHER")
        empty_course = CourseMaster.objects.create(
            course_title="Empty Course", course_code="EMPTY", category=other_cat
        )
        url = reverse("courses-detail", args=[empty_course.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["data"]["sections"]), 0)

    def test_mixed_content_handling(self):
        """Verify that multiple content types in a lesson are serialised."""
        CourseContent.objects.create(lesson=self.lesson, content_type="DOCUMENT", display_order=2)
        CourseContent.objects.create(lesson=self.lesson, content_type="QUIZ", display_order=3)
        
        url = reverse("courses-detail", args=[self.course.id])
        response = self.client.get(url)
        data = response.json()["data"]
        contents = data["sections"][0]["lessons"][0]["contents"]
        self.assertEqual(len(contents), 3)

    def test_search_functionality(self):
        """Verify that search filters correctly by course title."""
        CourseMaster.objects.create(
            course_title="Java Programming", course_code="JAVA01", category=self.category
        )
        url = reverse("courses-list")
        response = self.client.get(url, {"search": "Python"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        json_resp = response.json()
        data = json_resp.get("results") or json_resp.get("data", {}).get("results") or json_resp.get("data", [])
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["course_title"], "Python Deep Dive")

    def test_forum_contribution(self):
        """Verify that a student can post a reply to a thread."""
        thread = CourseDiscussionThread.objects.create(
            course=self.course, created_by=self.employee, thread_title="Help!"
        )
        url = reverse("course_discussion_replies-list")
        response = self.client.post(url, {
            "thread": thread.id,
            "created_by": self.employee.id,
            "reply_text": "I can help with this."
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CourseDiscussionReply.objects.filter(thread=thread).count(), 1)

    def test_permission_denial(self):
        """Verify that without specific permissions, adding a course is blocked."""
        url = reverse("courses-list")
        response = self.client.post(url, {
             "course_title": "Hidden",
             "course_code": "SEC_CRS",
             "category": self.category.id
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_curriculum_sync_accepts_supported_lesson_and_content_fields(self):
        """Verify curriculum sync matches the real lesson/content model contract."""
        perm_edit = PermissionMaster.objects.create(
            permission_group=self.perm_group,
            permission_name="Edit Courses",
            permission_code="COURSE_EDIT"
        )
        RolePermissionMaster.objects.create(role=self.lms_role, permission=perm_edit)

        url = reverse("courses-sync-curriculum", args=[self.course.id])
        response = self.client.patch(url, {
            "sections": [
                {
                    "id": self.section.id,
                    "section_title": "Part 1: Variables",
                    "display_order": 1,
                    "lessons": [
                        {
                            "id": self.lesson.id,
                            "lesson_title": "Intro Updated",
                            "estimated_duration_minutes": 30,
                            "display_order": 1,
                            "contents": [
                                {
                                    "id": self.content.id,
                                    "content_type": "VIDEO",
                                    "content_url": "https://example.com/python-intro",
                                    "display_order": 1
                                },
                                {
                                    "content_type": "LINK",
                                    "content_url": "https://docs.example.com/python-intro",
                                    "display_order": 2
                                }
                            ]
                        }
                    ]
                }
            ]
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.lesson.refresh_from_db()
        self.assertEqual(self.lesson.lesson_title, "Intro Updated")
        self.assertEqual(self.lesson.estimated_duration_minutes, 30)

        contents = list(self.lesson.contents.order_by("display_order"))
        self.assertEqual(len(contents), 2)
        self.assertEqual(contents[0].content_url, "https://example.com/python-intro")
        self.assertEqual(contents[1].content_type, "LINK")
