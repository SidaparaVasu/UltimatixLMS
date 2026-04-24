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
        description="Returns time-bucketed login and course completion data for activity chart.",
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
        
        Returns activity chart data with time-bucketed metrics.
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
