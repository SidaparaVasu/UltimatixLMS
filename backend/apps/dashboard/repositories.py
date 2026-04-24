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
from apps.auth_security.models import AuthUser, AuthLoginAttempt
from apps.auth_security.constants import AttemptStatus


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
        Returns time-bucketed login and course completion data for activity chart.
        
        Args:
            filter_type: 'daily', 'weekly', 'monthly', or 'annual'
            company_id: Optional company filter
        
        Returns:
            List of dicts with {label, logins, course_completions}
        """
        now = timezone.now()
        
        # Determine time range and bucket format
        if filter_type == "daily":
            start_date = now - timedelta(days=7)
            date_format = "%Y-%m-%d"
            bucket_count = 7
        elif filter_type == "weekly":
            start_date = now - timedelta(weeks=8)
            date_format = "%Y-W%W"  # ISO week format
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
            # Default to daily
            start_date = now - timedelta(days=7)
            date_format = "%Y-%m-%d"
            bucket_count = 7
        
        # Query login attempts (successful only)
        login_query = AuthLoginAttempt.objects.filter(
            attempt_status=AttemptStatus.SUCCESS,
            attempt_time__gte=start_date
        )
        
        # Query course completions
        completion_query = UserCourseEnrollment.objects.filter(
            status=ProgressStatus.COMPLETED,
            completed_at__gte=start_date
        )
        if company_id:
            completion_query = completion_query.filter(employee__company_id=company_id)
        
        # Aggregate by time bucket
        # Note: pass tzinfo=datetime.timezone.utc to avoid timezone conversion
        from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, TruncYear
        import datetime as dt

        if filter_type == "daily":
            login_trunc = TruncDate('attempt_time')
            completion_trunc = TruncDate('completed_at')
        elif filter_type == "weekly":
            login_trunc = TruncWeek('attempt_time', tzinfo=dt.timezone.utc)
            completion_trunc = TruncWeek('completed_at', tzinfo=dt.timezone.utc)
        elif filter_type == "monthly":
            login_trunc = TruncMonth('attempt_time', tzinfo=dt.timezone.utc)
            completion_trunc = TruncMonth('completed_at', tzinfo=dt.timezone.utc)
        else:  # annual
            login_trunc = TruncYear('attempt_time', tzinfo=dt.timezone.utc)
            completion_trunc = TruncYear('completed_at', tzinfo=dt.timezone.utc)
        
        # Aggregate logins
        login_data = login_query.annotate(
            bucket=login_trunc
        ).values('bucket').annotate(
            count=Count('id')
        ).order_by('bucket')

        # Aggregate completions
        completion_data = completion_query.annotate(
            bucket=completion_trunc
        ).values('bucket').annotate(
            count=Count('id')
        ).order_by('bucket')
        # (can occur when Trunc returns NULL for timezone-aware datetimes with no data)
        login_dict = {
            item['bucket'].strftime(date_format): item['count']
            for item in login_data
            if item['bucket'] is not None
        }
        completion_dict = {
            item['bucket'].strftime(date_format): item['count']
            for item in completion_data
            if item['bucket'] is not None
        }
        
        # Generate all buckets in range
        result = []
        current = start_date
        
        for i in range(bucket_count):
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
                # Move to next month
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
            else:  # annual
                label = current.strftime("%Y")
                key = current.strftime(date_format)
                current = current.replace(year=current.year + 1)
            
            result.append({
                "label": label,
                "logins": login_dict.get(key, 0),
                "course_completions": completion_dict.get(key, 0),
            })
        
        return result

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
