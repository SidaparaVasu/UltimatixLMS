"""
Dashboard serializers.

Defines response shapes for dashboard endpoints.
"""

from rest_framework import serializers


class EmployeeSummarySerializer(serializers.Serializer):
    """
    Employee dashboard enrollment summary.
    """
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    not_started = serializers.IntegerField()
    overdue = serializers.IntegerField()
    certificates_earned = serializers.IntegerField()


class TeamMemberSerializer(serializers.Serializer):
    """
    Individual team member stats for manager dashboard.
    """
    employee_id = serializers.IntegerField()
    employee_code = serializers.CharField()
    employee_name = serializers.CharField()
    department = serializers.CharField()
    in_progress_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    completion_percentage = serializers.FloatField()
    overdue_count = serializers.IntegerField()
    avg_progress = serializers.FloatField()


class ManagerTeamStatsSerializer(serializers.Serializer):
    """
    Manager dashboard team overview.
    """
    team_size = serializers.IntegerField()
    team_completion_rate = serializers.FloatField()
    team_in_progress = serializers.IntegerField()
    team_overdue = serializers.IntegerField()
    team_members = TeamMemberSerializer(many=True)


class AdminPortalStatsSerializer(serializers.Serializer):
    """
    Admin dashboard portal statistics.
    """
    active_users = serializers.IntegerField()
    published_courses = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    certificates_issued = serializers.IntegerField()
    pending_approvals = serializers.IntegerField()


class ActivityChartDataPointSerializer(serializers.Serializer):
    """
    Single data point in activity chart.
    """
    label = serializers.CharField()
    logins = serializers.IntegerField()
    course_completions = serializers.IntegerField()


class ActivityChartSerializer(serializers.Serializer):
    """
    Activity chart data with time-bucketed metrics.
    """
    filter_type = serializers.CharField()
    data = ActivityChartDataPointSerializer(many=True)


class RecentEnrollmentSerializer(serializers.Serializer):
    """
    Recent enrollment entry for admin dashboard.
    """
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    course_title = serializers.CharField()
    course_code = serializers.CharField()
    enrolled_at = serializers.CharField()
    status = serializers.CharField()
    progress_percentage = serializers.FloatField()
