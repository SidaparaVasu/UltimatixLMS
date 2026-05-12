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
    Tracks three learning-progress metrics per time bucket:
      - course_completions : enrollments that reached COMPLETED status
      - new_enrollments    : new enrollments created in the period (pipeline)
      - certificates_issued: certificates awarded in the period (outcomes)
    """
    label = serializers.CharField()
    course_completions = serializers.IntegerField()
    new_enrollments = serializers.IntegerField()
    certificates_issued = serializers.IntegerField()


class ActivityChartSerializer(serializers.Serializer):
    """
    Activity chart data with time-bucketed metrics.
    """
    filter_type = serializers.CharField()
    data = ActivityChartDataPointSerializer(many=True)


class HrOverviewSerializer(serializers.Serializer):
    """
    HR dashboard company-wide employee and learning statistics.
    """
    total_employees = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    in_progress = serializers.IntegerField()
    overdue = serializers.IntegerField()


class ScopedEmployeeSerializer(serializers.Serializer):
    """
    Per-employee learning stats for HR dashboard chart and table.
    Mirrors TeamMemberSerializer but sourced from scope-filtered employees.
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


class TrainingPlanApprovalItemSerializer(serializers.Serializer):
    """Single pending training plan approval."""
    id = serializers.IntegerField()
    plan_name = serializers.CharField()
    department = serializers.CharField()
    submitted_by = serializers.CharField(allow_null=True)
    submitted_at = serializers.CharField()


class TniReviewPendingItemSerializer(serializers.Serializer):
    """Single employee awaiting TNI manager review."""
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    employee_code = serializers.CharField()
    submitted_at = serializers.CharField(allow_null=True)


class PendingApprovalsSerializer(serializers.Serializer):
    """
    Manager dashboard pending approvals — combines training plan approvals
    and TNI self-rating reviews awaiting manager action.
    """
    training_plan_approvals = TrainingPlanApprovalItemSerializer(many=True)
    tni_reviews_pending = TniReviewPendingItemSerializer(many=True)
    total = serializers.IntegerField()
