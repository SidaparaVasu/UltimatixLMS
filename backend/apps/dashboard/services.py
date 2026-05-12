"""
Dashboard services.

Orchestrates business logic for dashboard data assembly.
"""

from common.services.base import BaseService
from .repositories import DashboardRepository


class DashboardService(BaseService):
    """
    Service layer for dashboard operations.
    """
    
    def __init__(self):
        self.repository = DashboardRepository()

    # -------------------------------------------------------------------------
    # Employee Dashboard
    # -------------------------------------------------------------------------

    def get_employee_summary(self, employee_id):
        """
        Returns enrollment summary for an employee dashboard.
        """
        return self.repository.get_employee_enrollment_summary(employee_id)

    # -------------------------------------------------------------------------
    # Manager Dashboard
    # -------------------------------------------------------------------------

    def get_manager_team_overview(self, manager_employee_id):
        """
        Returns team statistics for a manager's dashboard.
        """
        return self.repository.get_manager_team_stats(manager_employee_id)

    # -------------------------------------------------------------------------
    # Admin Dashboard
    # -------------------------------------------------------------------------

    def get_admin_portal_statistics(self, company_id=None):
        """
        Returns portal-wide statistics for admin dashboard.
        """
        return self.repository.get_admin_portal_stats(company_id)

    def get_activity_chart(self, filter_type="daily", company_id=None):
        """
        Returns activity chart data with time-bucketed learning metrics:
        completions, new enrollments, and certificates issued.
        """
        valid_filters = ["daily", "weekly", "monthly", "annual"]
        if filter_type not in valid_filters:
            filter_type = "daily"
        
        return self.repository.get_activity_chart_data(filter_type, company_id)

    def get_pending_approvals(self, user):
        """
        Returns pending training plan approvals and TNI reviews for the manager dashboard.
        """
        return self.repository.get_pending_approvals(user)

    def get_recent_enrollments(self, company_id=None, limit=10):
        """
        Returns recent enrollments for admin dashboard.
        """
        return self.repository.get_recent_enrollments(company_id, limit)

    def get_hr_overview(self, company_id=None, scope_type="GLOBAL", scope_id=None):
        """
        Returns scoped employee and learning stats for the HR dashboard.
        Scope is derived from the user's HR role assignment.
        """
        return self.repository.get_company_employee_stats(company_id, scope_type, scope_id)

    def get_hr_scoped_employees(self, company_id=None, scope_type="GLOBAL", scope_id=None):
        """
        Returns per-employee learning stats scoped by the user's role assignment.
        Used for the HR dashboard chart and table.
        """
        return self.repository.get_scoped_employees(company_id, scope_type, scope_id)
