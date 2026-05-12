"""
Dashboard repositories.

Handles all database queries for dashboard statistics and aggregations.
"""

from django.db.models import Count, Q, Avg, Sum, F
from django.utils import timezone
from datetime import timedelta
from common.repositories.base import BaseRepository
from apps.learning_progress.models import UserCourseEnrollment, CourseCertificate
from apps.learning_progress.constants import ProgressStatus, EnrollmentType
from apps.course_management.models import CourseMaster, CourseStatus
from apps.org_management.models import EmployeeMaster, EmployeeReportingManager
from apps.auth_security.models import AuthUser


class DashboardRepository(BaseRepository):
    """
    Repository for dashboard data aggregations.
    No model attribute since this is a pure query repository.
    """
    
    def __init__(self):
        # Skip BaseRepository's model validation
        pass

    # -------------------------------------------------------------------------
    # Employee Dashboard Queries
    # -------------------------------------------------------------------------

    def get_employee_enrollment_summary(self, employee_id):
        """
        Returns enrollment counts and certificate count for an employee.
        """
        enrollments = UserCourseEnrollment.objects.filter(employee_id=employee_id)
        
        in_progress = enrollments.filter(status=ProgressStatus.IN_PROGRESS).count()
        completed = enrollments.filter(status=ProgressStatus.COMPLETED).count()
        not_started = enrollments.filter(status=ProgressStatus.NOT_STARTED).count()
        
        # Overdue: mandatory/TNI courses not completed within 30 days of enrollment
        overdue_threshold = timezone.now() - timedelta(days=30)
        overdue = enrollments.filter(
            status__in=[ProgressStatus.IN_PROGRESS, ProgressStatus.NOT_STARTED],
            enrollment_type__in=[EnrollmentType.MANDATORY, EnrollmentType.TNI_ASSIGNED],
            enrolled_at__lt=overdue_threshold
        ).count()
        
        # Certificates earned
        certificates_earned = CourseCertificate.objects.filter(
            enrollment__employee_id=employee_id
        ).count()
        
        return {
            "in_progress": in_progress,
            "completed": completed,
            "not_started": not_started,
            "overdue": overdue,
            "certificates_earned": certificates_earned,
        }

    # -------------------------------------------------------------------------
    # Manager Dashboard Queries
    # -------------------------------------------------------------------------

    def get_manager_team_stats(self, manager_employee_id):
        """
        Returns team statistics for a manager's direct reports.
        """
        # Get direct reports
        direct_reports = EmployeeReportingManager.objects.filter(
            manager_id=manager_employee_id,
            relationship_type="DIRECT"
        ).select_related('employee', 'employee__user', 'employee__user__profile')
        
        team_member_ids = [rel.employee_id for rel in direct_reports]
        team_size = len(team_member_ids)
        
        if team_size == 0:
            return {
                "team_size": 0,
                "team_completion_rate": 0,
                "team_in_progress": 0,
                "team_overdue": 0,
                "team_members": []
            }
        
        # Aggregate team enrollments
        team_enrollments = UserCourseEnrollment.objects.filter(
            employee_id__in=team_member_ids
        )
        
        total_enrollments = team_enrollments.count()
        completed_enrollments = team_enrollments.filter(status=ProgressStatus.COMPLETED).count()
        in_progress_enrollments = team_enrollments.filter(status=ProgressStatus.IN_PROGRESS).count()
        
        # Team completion rate
        team_completion_rate = (
            (completed_enrollments / total_enrollments * 100) 
            if total_enrollments > 0 else 0
        )
        
        # Team overdue count
        team_overdue = team_enrollments.filter(
            status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
            enrollment_type__in=[EnrollmentType.MANDATORY, EnrollmentType.TNI_ASSIGNED],
            enrolled_at__lt=timezone.now() - timedelta(days=30)
        ).count()
        
        # Individual team member stats
        team_members = []
        for rel in direct_reports:
            employee = rel.employee
            member_enrollments = UserCourseEnrollment.objects.filter(employee=employee)
            
            member_in_progress = member_enrollments.filter(status=ProgressStatus.IN_PROGRESS).count()
            member_completed = member_enrollments.filter(status=ProgressStatus.COMPLETED).count()
            member_total = member_enrollments.count()
            member_completion_pct = (
                (member_completed / member_total * 100) 
                if member_total > 0 else 0
            )
            member_overdue = member_enrollments.filter(
                status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
                enrollment_type__in=[EnrollmentType.MANDATORY, EnrollmentType.TNI_ASSIGNED],
                enrolled_at__lt=timezone.now() - timedelta(days=30)
            ).count()
            
            # Get average progress percentage
            avg_progress = member_enrollments.filter(
                status=ProgressStatus.IN_PROGRESS
            ).aggregate(avg=Avg('progress_percentage'))['avg'] or 0
            
            team_members.append({
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "employee_name": employee.user_label() if employee.user else employee.employee_code,
                "department": employee.department.department_name,
                "in_progress_count": member_in_progress,
                "completed_count": member_completed,
                "completion_percentage": round(member_completion_pct, 2),
                "overdue_count": member_overdue,
                "avg_progress": round(float(avg_progress), 2),
            })
        
        return {
            "team_size": team_size,
            "team_completion_rate": round(team_completion_rate, 2),
            "team_in_progress": in_progress_enrollments,
            "team_overdue": team_overdue,
            "team_members": team_members,
        }

    # -------------------------------------------------------------------------
    # Admin Dashboard Queries
    # -------------------------------------------------------------------------

    def get_admin_portal_stats(self, company_id=None):
        """
        Returns portal-wide statistics for admin dashboard.
        Optionally scoped to a specific company.
        """
        # Active users (employees with user accounts)
        users_query = AuthUser.objects.filter(is_active=True)
        if company_id:
            users_query = users_query.filter(employee_record__company_id=company_id)
        active_users = users_query.count()
        
        # Published courses
        courses_query = CourseMaster.objects.filter(
            status=CourseStatus.PUBLISHED,
            is_active=True
        )
        published_courses = courses_query.count()
        
        # Total enrollments
        enrollments_query = UserCourseEnrollment.objects.all()
        if company_id:
            enrollments_query = enrollments_query.filter(employee__company_id=company_id)
        total_enrollments = enrollments_query.count()
        
        # Completion rate
        completed_enrollments = enrollments_query.filter(status=ProgressStatus.COMPLETED).count()
        completion_rate = (
            (completed_enrollments / total_enrollments * 100) 
            if total_enrollments > 0 else 0
        )
        
        # Certificates issued
        certificates_query = CourseCertificate.objects.all()
        if company_id:
            certificates_query = certificates_query.filter(enrollment__employee__company_id=company_id)
        certificates_issued = certificates_query.count()
        
        # Pending approvals (TNI + Training Plans)
        # Note: TNI and Training Plan models will be queried when those features are built
        # For now, return 0 as placeholder
        pending_approvals = 0
        
        return {
            "active_users": active_users,
            "published_courses": published_courses,
            "total_enrollments": total_enrollments,
            "completion_rate": round(completion_rate, 2),
            "certificates_issued": certificates_issued,
            "pending_approvals": pending_approvals,
        }

    def get_activity_chart_data(self, filter_type="daily", company_id=None):
        """
        Returns time-bucketed course activity data for the admin activity chart.

        Tracks three meaningful learning metrics per bucket:
          - course_completions : enrollments that reached COMPLETED status
          - new_enrollments    : enrollments created in the period (pipeline)
          - certificates_issued: certificates awarded in the period (outcomes)

        Logins have been removed — they are a different scale/category and
        are not meaningful alongside learning-progress metrics.

        Args:
            filter_type: 'daily', 'weekly', 'monthly', or 'annual'
            company_id: Optional company filter

        Returns:
            List of dicts with {label, course_completions, new_enrollments, certificates_issued}
        """
        from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, TruncYear
        import datetime as dt

        now = timezone.now()

        # ── Time range & bucket config ────────────────────────────────────
        if filter_type == "daily":
            start_date = now - timedelta(days=7)
            date_format = "%Y-%m-%d"
            bucket_count = 7
        elif filter_type == "weekly":
            start_date = now - timedelta(weeks=8)
            date_format = "%Y-W%W"
            bucket_count = 8
        elif filter_type == "monthly":
            start_date = now - timedelta(days=365)
            date_format = "%Y-%m"
            bucket_count = 12
        elif filter_type == "annual":
            start_date = now - timedelta(days=365 * 5)
            date_format = "%Y"
            bucket_count = 5
        else:
            start_date = now - timedelta(days=7)
            date_format = "%Y-%m-%d"
            bucket_count = 7

        # ── Trunc functions per bucket size ───────────────────────────────
        if filter_type == "daily":
            completion_trunc  = TruncDate('completed_at')
            enrollment_trunc  = TruncDate('enrolled_at')
            certificate_trunc = TruncDate('issued_at')
        elif filter_type == "weekly":
            completion_trunc  = TruncWeek('completed_at',  tzinfo=dt.timezone.utc)
            enrollment_trunc  = TruncWeek('enrolled_at',   tzinfo=dt.timezone.utc)
            certificate_trunc = TruncWeek('issued_at',     tzinfo=dt.timezone.utc)
        elif filter_type == "monthly":
            completion_trunc  = TruncMonth('completed_at',  tzinfo=dt.timezone.utc)
            enrollment_trunc  = TruncMonth('enrolled_at',   tzinfo=dt.timezone.utc)
            certificate_trunc = TruncMonth('issued_at',     tzinfo=dt.timezone.utc)
        else:  # annual
            completion_trunc  = TruncYear('completed_at',  tzinfo=dt.timezone.utc)
            enrollment_trunc  = TruncYear('enrolled_at',   tzinfo=dt.timezone.utc)
            certificate_trunc = TruncYear('issued_at',     tzinfo=dt.timezone.utc)

        # ── Base querysets ────────────────────────────────────────────────
        enrollment_base = UserCourseEnrollment.objects.all()
        certificate_base = CourseCertificate.objects.all()
        if company_id:
            enrollment_base  = enrollment_base.filter(employee__company_id=company_id)
            certificate_base = certificate_base.filter(enrollment__employee__company_id=company_id)

        # ── Completions ───────────────────────────────────────────────────
        completion_data = (
            enrollment_base
            .filter(status=ProgressStatus.COMPLETED, completed_at__gte=start_date)
            .annotate(bucket=completion_trunc)
            .values('bucket')
            .annotate(count=Count('id'))
            .order_by('bucket')
        )
        completion_dict = {
            item['bucket'].strftime(date_format): item['count']
            for item in completion_data
            if item['bucket'] is not None
        }

        # ── New enrollments ───────────────────────────────────────────────
        enrollment_data = (
            enrollment_base
            .filter(enrolled_at__gte=start_date)
            .annotate(bucket=enrollment_trunc)
            .values('bucket')
            .annotate(count=Count('id'))
            .order_by('bucket')
        )
        enrollment_dict = {
            item['bucket'].strftime(date_format): item['count']
            for item in enrollment_data
            if item['bucket'] is not None
        }

        # ── Certificates issued ───────────────────────────────────────────
        certificate_data = (
            certificate_base
            .filter(issued_at__gte=start_date)
            .annotate(bucket=certificate_trunc)
            .values('bucket')
            .annotate(count=Count('id'))
            .order_by('bucket')
        )
        certificate_dict = {
            item['bucket'].strftime(date_format): item['count']
            for item in certificate_data
            if item['bucket'] is not None
        }

        # ── Generate all buckets in range ─────────────────────────────────
        result = []
        current = start_date

        for _ in range(bucket_count):
            if filter_type == "daily":
                label = current.strftime("%b %d")
                key = current.strftime(date_format)
                current += timedelta(days=1)
            elif filter_type == "weekly":
                label = f"Week {current.strftime('%W')}"
                key = current.strftime(date_format)
                current += timedelta(weeks=1)
            elif filter_type == "monthly":
                label = current.strftime("%b %Y")
                key = current.strftime(date_format)
                current = current.replace(
                    year=current.year + 1 if current.month == 12 else current.year,
                    month=1 if current.month == 12 else current.month + 1,
                )
            else:  # annual
                label = current.strftime("%Y")
                key = current.strftime(date_format)
                current = current.replace(year=current.year + 1)

            result.append({
                "label": label,
                "course_completions": completion_dict.get(key, 0),
                "new_enrollments": enrollment_dict.get(key, 0),
                "certificates_issued": certificate_dict.get(key, 0),
            })

        return result

    def get_company_employee_stats(self, company_id=None, scope_type="GLOBAL", scope_id=None):
        """
        Returns employee and learning statistics scoped by the user's role assignment.

        Scope resolution:
          GLOBAL / COMPANY  → all active employees in the company
          BUSINESS_UNIT     → employees in the given business unit
          DEPARTMENT        → employees in the given department
          SELF              → falls back to company scope
        """
        from apps.org_management.constants import EmploymentStatus

        employees_query = EmployeeMaster.objects.filter(
            employment_status=EmploymentStatus.ACTIVE
        )

        if scope_type == "BUSINESS_UNIT" and scope_id:
            employees_query = employees_query.filter(business_unit_id=scope_id)
        elif scope_type == "DEPARTMENT" and scope_id:
            employees_query = employees_query.filter(department_id=scope_id)
        elif company_id:
            employees_query = employees_query.filter(company_id=company_id)

        total_employees = employees_query.count()
        employee_ids = list(employees_query.values_list("id", flat=True))

        enrollments_query = UserCourseEnrollment.objects.filter(
            employee_id__in=employee_ids
        )

        total_enrollments = enrollments_query.count()
        completed = enrollments_query.filter(status=ProgressStatus.COMPLETED).count()
        in_progress = enrollments_query.filter(status=ProgressStatus.IN_PROGRESS).count()

        completion_rate = (
            (completed / total_enrollments * 100)
            if total_enrollments > 0 else 0
        )

        overdue_threshold = timezone.now() - timedelta(days=30)
        overdue = enrollments_query.filter(
            status__in=[ProgressStatus.IN_PROGRESS, ProgressStatus.NOT_STARTED],
            enrollment_type__in=[EnrollmentType.MANDATORY, EnrollmentType.TNI_ASSIGNED],
            enrolled_at__lt=overdue_threshold
        ).count()

        return {
            "total_employees": total_employees,
            "total_enrollments": total_enrollments,
            "completion_rate": round(completion_rate, 2),
            "in_progress": in_progress,
            "overdue": overdue,
        }

    def get_scoped_employees(self, company_id=None, scope_type="GLOBAL", scope_id=None):
        """
        Returns per-employee learning stats for the scoped set of employees.
        Used for the HR dashboard chart and table (replaces direct-reports logic).
        """
        from apps.org_management.constants import EmploymentStatus

        employees_query = EmployeeMaster.objects.filter(
            employment_status=EmploymentStatus.ACTIVE
        ).select_related("user", "user__profile", "department")

        if scope_type == "BUSINESS_UNIT" and scope_id:
            employees_query = employees_query.filter(business_unit_id=scope_id)
        elif scope_type == "DEPARTMENT" and scope_id:
            employees_query = employees_query.filter(department_id=scope_id)
        elif company_id:
            employees_query = employees_query.filter(company_id=company_id)

        members = []
        for employee in employees_query:
            member_enrollments = UserCourseEnrollment.objects.filter(employee=employee)

            member_in_progress = member_enrollments.filter(status=ProgressStatus.IN_PROGRESS).count()
            member_completed = member_enrollments.filter(status=ProgressStatus.COMPLETED).count()
            member_total = member_enrollments.count()
            member_completion_pct = (
                (member_completed / member_total * 100)
                if member_total > 0 else 0
            )
            member_overdue = member_enrollments.filter(
                status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
                enrollment_type__in=[EnrollmentType.MANDATORY, EnrollmentType.TNI_ASSIGNED],
                enrolled_at__lt=timezone.now() - timedelta(days=30)
            ).count()
            avg_progress = member_enrollments.filter(
                status=ProgressStatus.IN_PROGRESS
            ).aggregate(avg=Avg("progress_percentage"))["avg"] or 0

            members.append({
                "employee_id": employee.id,
                "employee_code": employee.employee_code,
                "employee_name": employee.user_label() if employee.user else employee.employee_code,
                "department": employee.department.department_name,
                "in_progress_count": member_in_progress,
                "completed_count": member_completed,
                "completion_percentage": round(member_completion_pct, 2),
                "overdue_count": member_overdue,
                "avg_progress": round(float(avg_progress), 2),
            })

        return members

    def get_recent_enrollments(self, company_id=None, limit=10):
        """
        Returns the most recent enrollments across all users.
        Used for admin dashboard recent activity table.
        """
        query = UserCourseEnrollment.objects.select_related(
            'employee', 'employee__user', 'employee__user__profile', 'course'
        ).order_by('-enrolled_at')
        
        if company_id:
            query = query.filter(employee__company_id=company_id)
        
        enrollments = query[:limit]
        
        result = []
        for enrollment in enrollments:
            result.append({
                "employee_name": enrollment.employee.user_label() if enrollment.employee.user else enrollment.employee.employee_code,
                "employee_code": enrollment.employee.employee_code,
                "course_title": enrollment.course.course_title,
                "course_code": enrollment.course.course_code,
                "enrolled_at": enrollment.enrolled_at.isoformat(),
                "status": enrollment.status,
                "progress_percentage": float(enrollment.progress_percentage),
            })
        
        return result

    def get_pending_approvals(self, user):
        """
        Returns pending approval items for the manager dashboard.

        Two categories:
          1. Training plan approvals where this user is the designated approver
             and the approval is still PENDING.
          2. TNI self-ratings submitted by direct reports that are awaiting
             manager review (no SUBMITTED manager rating yet).

        Returns a dict with:
          - training_plan_approvals: list of {id, plan_name, department, submitted_by, submitted_at}
          - tni_reviews_pending: list of {employee_id, employee_name, employee_code, submitted_at}
          - total: combined count
        """
        from apps.training_planning.models import TrainingPlanApproval
        from apps.skill_management.models import EmployeeSkillRating, SkillRatingType, SkillRatingStatus
        from apps.org_management.models import EmployeeMaster, EmployeeReportingManager

        # ── 1. Training plan approvals ────────────────────────────────────
        employee = EmployeeMaster.objects.filter(user=user).first()

        plan_approvals = []
        if employee:
            pending_approvals = TrainingPlanApproval.objects.filter(
                approver=employee,
                approval_status="PENDING",
            ).select_related(
                "training_plan",
                "training_plan__department",
                "submitted_by__user__profile",
            ).order_by("-created_at")

            for approval in pending_approvals:
                submitted_by_name = None
                if approval.submitted_by:
                    try:
                        p = approval.submitted_by.user.profile
                        submitted_by_name = f"{p.first_name} {p.last_name}".strip()
                    except Exception:
                        submitted_by_name = approval.submitted_by.employee_code

                plan_approvals.append({
                    "id": approval.id,
                    "plan_name": approval.training_plan.plan_name,
                    "department": approval.training_plan.department.department_name,
                    "submitted_by": submitted_by_name,
                    "submitted_at": approval.created_at.isoformat(),
                })

        # ── 2. TNI reviews pending ────────────────────────────────────────
        tni_pending = []
        if employee:
            direct_report_ids = EmployeeReportingManager.objects.filter(
                manager_id=employee.id,
                relationship_type="DIRECT",
            ).values_list("employee_id", flat=True)

            # Employees who have SUBMITTED self-ratings
            submitted_employee_ids = (
                EmployeeSkillRating.objects.filter(
                    employee_id__in=direct_report_ids,
                    rating_type=SkillRatingType.SELF,
                    status=SkillRatingStatus.SUBMITTED,
                )
                .values_list("employee_id", flat=True)
                .distinct()
            )

            # Exclude those already reviewed by manager (have a SUBMITTED manager rating)
            reviewed_employee_ids = (
                EmployeeSkillRating.objects.filter(
                    employee_id__in=submitted_employee_ids,
                    rating_type=SkillRatingType.MANAGER,
                    status=SkillRatingStatus.SUBMITTED,
                )
                .values_list("employee_id", flat=True)
                .distinct()
            )

            pending_review_ids = set(submitted_employee_ids) - set(reviewed_employee_ids)

            for emp in EmployeeMaster.objects.filter(
                id__in=pending_review_ids
            ).select_related("user__profile"):
                name = emp.employee_code
                try:
                    p = emp.user.profile
                    name = f"{p.first_name} {p.last_name}".strip() or name
                except Exception:
                    pass

                # Get the most recent self-rating submission time
                latest = (
                    EmployeeSkillRating.objects.filter(
                        employee=emp,
                        rating_type=SkillRatingType.SELF,
                        status=SkillRatingStatus.SUBMITTED,
                    )
                    .order_by("-submitted_at")
                    .first()
                )

                tni_pending.append({
                    "employee_id": emp.id,
                    "employee_name": name,
                    "employee_code": emp.employee_code,
                    "submitted_at": latest.submitted_at.isoformat() if latest and latest.submitted_at else None,
                })

        return {
            "training_plan_approvals": plan_approvals,
            "tni_reviews_pending": tni_pending,
            "total": len(plan_approvals) + len(tni_pending),
        }
