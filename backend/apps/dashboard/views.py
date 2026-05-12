"""
Dashboard views.

Provides dashboard statistics endpoints for Employee, Manager, and Admin roles.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, error_response
from .services import DashboardService
from .serializers import (
    EmployeeSummarySerializer,
    ManagerTeamStatsSerializer,
    AdminPortalStatsSerializer,
    ActivityChartSerializer,
    RecentEnrollmentSerializer,
    HrOverviewSerializer,
    ScopedEmployeeSerializer,
    PendingApprovalsSerializer,
)


class DashboardViewSet(viewsets.ViewSet):
    """
    Dashboard statistics endpoints.
    
    Provides three main endpoints:
    - employee-summary: For employee dashboard
    - manager-stats: For manager dashboard
    - admin-stats: For admin/HR dashboard
    - activity-chart: For admin portal activity chart
    - recent-enrollments: For admin recent activity table
    """
    permission_classes = [IsAuthenticated]
    service = DashboardService()

    def _get_user_employee(self, request):
        """Helper to get the employee record for the current user."""
        if hasattr(request.user, 'employee_record'):
            return request.user.employee_record.first()
        return None

    def _get_user_company(self, request):
        """Helper to get the company associated with the logged-in user."""
        employee = self._get_user_employee(request)
        return employee.company if employee else None

    def _get_hr_scope(self, request):
        """
        Resolves the scope for the HR dashboard from the user's HR role assignment.

        Returns (scope_type, scope_id):
          - GLOBAL / COMPANY  → ("GLOBAL", None)  — all company employees
          - BUSINESS_UNIT     → ("BUSINESS_UNIT", <bu_id>)
          - DEPARTMENT        → ("DEPARTMENT", <dept_id>)
          - SELF / fallback   → ("GLOBAL", None)
        """
        from apps.rbac.models import UserRoleMaster
        from apps.rbac.constants import ScopeType

        hr_assignment = UserRoleMaster.objects.filter(
            user=request.user,
            role__role_code="HR",
            is_active=True,
        ).first()

        if not hr_assignment:
            return "GLOBAL", None

        scope_type = hr_assignment.scope_type
        scope_id = hr_assignment.scope_id

        if scope_type in (ScopeType.GLOBAL, ScopeType.COMPANY, ScopeType.SELF):
            return "GLOBAL", None
        if scope_type == ScopeType.BUSINESS_UNIT:
            return "BUSINESS_UNIT", scope_id
        if scope_type == ScopeType.DEPARTMENT:
            return "DEPARTMENT", scope_id

        return "GLOBAL", None

    @extend_schema(
        summary="Employee Dashboard Summary",
        description="Returns enrollment summary for the current employee's dashboard.",
        responses={200: EmployeeSummarySerializer}
    )
    @action(detail=False, methods=["get"], url_path="employee-summary")
    def employee_summary(self, request):
        """
        GET /api/v1/dashboard/employee-summary/
        
        Returns enrollment counts and certificate count for the current employee.
        """
        employee = self._get_user_employee(request)
        if not employee:
            return error_response(
                message="Employee profile not found for this user.",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        summary = self.service.get_employee_summary(employee.id)
        serializer = EmployeeSummarySerializer(summary)
        
        return success_response(
            message="Employee summary retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="HR Overview Statistics",
        description="Returns scoped employee count and learning stats for the HR dashboard. Scope is derived from the user's HR role assignment (GLOBAL, BUSINESS_UNIT, or DEPARTMENT).",
        responses={200: HrOverviewSerializer}
    )
    @action(detail=False, methods=["get"], url_path="hr-stats")
    def hr_stats(self, request):
        """
        GET /api/v1/dashboard/hr-stats/

        Returns total employees, enrollment counts, and completion rate
        scoped by the user's HR role assignment.
        """
        company = self._get_user_company(request)
        company_id = company.id if company else None
        scope_type, scope_id = self._get_hr_scope(request)

        overview = self.service.get_hr_overview(company_id, scope_type, scope_id)
        serializer = HrOverviewSerializer(overview)

        return success_response(
            message="HR overview statistics retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="HR Scoped Employee List",
        description="Returns per-employee learning stats scoped by the user's HR role assignment. Used for the HR dashboard chart and table.",
        responses={200: ScopedEmployeeSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="hr-employees")
    def hr_employees(self, request):
        """
        GET /api/v1/dashboard/hr-employees/

        Returns per-employee learning stats for the HR dashboard chart and table,
        scoped by the user's HR role assignment.
        """
        company = self._get_user_company(request)
        company_id = company.id if company else None
        scope_type, scope_id = self._get_hr_scope(request)

        employees = self.service.get_hr_scoped_employees(company_id, scope_type, scope_id)
        serializer = ScopedEmployeeSerializer(employees, many=True)

        return success_response(
            message="HR scoped employees retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="Manager Team Statistics",
        description="Returns team overview and individual team member stats for managers.",
        responses={200: ManagerTeamStatsSerializer}
    )
    @action(detail=False, methods=["get"], url_path="manager-stats")
    def manager_stats(self, request):
        """
        GET /api/v1/dashboard/manager-stats/
        
        Returns team statistics for the current manager's direct reports.
        Requires the user to have an employee record.
        """
        employee = self._get_user_employee(request)
        if not employee:
            return error_response(
                message="Employee profile not found for this user.",
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        team_stats = self.service.get_manager_team_overview(employee.id)
        serializer = ManagerTeamStatsSerializer(team_stats)
        
        return success_response(
            message="Manager team statistics retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="Manager Pending Approvals",
        description="Returns pending training plan approvals and TNI self-rating reviews awaiting manager action.",
        responses={200: PendingApprovalsSerializer}
    )
    @action(detail=False, methods=["get"], url_path="pending-approvals")
    def pending_approvals(self, request):
        """
        GET /api/v1/dashboard/pending-approvals/

        Returns two categories of pending items for the manager:
          1. Training plan approvals where this user is the designated approver.
          2. TNI self-ratings submitted by direct reports awaiting manager review.
        """
        data = self.service.get_pending_approvals(request.user)
        serializer = PendingApprovalsSerializer(data)
        return success_response(
            message="Pending approvals retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="Admin Portal Statistics",
        description="Returns portal-wide statistics for admin dashboard.",
        responses={200: AdminPortalStatsSerializer}
    )
    @action(detail=False, methods=["get"], url_path="admin-stats")
    def admin_stats(self, request):
        """
        GET /api/v1/dashboard/admin-stats/
        
        Returns portal-wide statistics scoped to the user's company.
        """
        company = self._get_user_company(request)
        company_id = company.id if company else None
        
        stats = self.service.get_admin_portal_statistics(company_id)
        serializer = AdminPortalStatsSerializer(stats)
        
        return success_response(
            message="Admin portal statistics retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="Portal Activity Chart Data",
        description="Returns time-bucketed course completions, new enrollments, and certificates issued for the activity chart.",
        parameters=[
            OpenApiParameter(
                name="filter",
                type=str,
                description="Time bucket filter: 'daily', 'weekly', 'monthly', or 'annual'",
                required=False,
                default="daily"
            )
        ],
        responses={200: ActivityChartSerializer}
    )
    @action(detail=False, methods=["get"], url_path="activity-chart")
    def activity_chart(self, request):
        """
        GET /api/v1/dashboard/activity-chart/?filter=daily

        Returns activity chart data with time-bucketed learning metrics:
          - course_completions : enrollments that reached COMPLETED status
          - new_enrollments    : new enrollments created in the period
          - certificates_issued: certificates awarded in the period
        Query params:
            - filter: 'daily' (last 7 days), 'weekly' (last 8 weeks),
                      'monthly' (last 12 months), 'annual' (last 5 years)
        """
        filter_type = request.query_params.get("filter", "daily")
        company = self._get_user_company(request)
        company_id = company.id if company else None
        
        chart_data = self.service.get_activity_chart(filter_type, company_id)
        
        response_data = {
            "filter_type": filter_type,
            "data": chart_data
        }
        serializer = ActivityChartSerializer(response_data)
        
        return success_response(
            message="Activity chart data retrieved successfully.",
            data=serializer.data
        )

    @extend_schema(
        summary="Recent Enrollments",
        description="Returns the most recent enrollments across all users for admin dashboard.",
        parameters=[
            OpenApiParameter(
                name="limit",
                type=int,
                description="Number of recent enrollments to return (default: 10)",
                required=False,
                default=10
            )
        ],
        responses={200: RecentEnrollmentSerializer(many=True)}
    )
    @action(detail=False, methods=["get"], url_path="recent-enrollments")
    def recent_enrollments(self, request):
        """
        GET /api/v1/dashboard/recent-enrollments/?limit=10
        
        Returns recent enrollments for admin dashboard.
        """
        limit = int(request.query_params.get("limit", 10))
        company = self._get_user_company(request)
        company_id = company.id if company else None
        
        enrollments = self.service.get_recent_enrollments(company_id, limit)
        serializer = RecentEnrollmentSerializer(enrollments, many=True)
        
        return success_response(
            message="Recent enrollments retrieved successfully.",
            data=serializer.data
        )
