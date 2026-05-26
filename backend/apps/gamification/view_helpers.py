from rest_framework.response import Response

from apps.gamification.services import GamificationStatusService, LearnerGamificationService
from common.response import error_response, forbidden_response


def get_request_employee(user):
    employee_qs = getattr(user, "employee_record", None)
    if employee_qs is None:
        return None
    if hasattr(employee_qs, "first"):
        return employee_qs.first()
    return employee_qs


def require_active_gamification(request) -> tuple:
    """
    Returns (employee, None) when gamification is active for the caller.
    Returns (None, error Response) otherwise.
    """
    employee = get_request_employee(request.user)
    if error := _require_gamification_employee(employee):
        return None, error

    if not GamificationStatusService().is_globally_enabled():
        return None, forbidden_response("Gamification is not enabled.")

    service = LearnerGamificationService()
    if not service.is_active_for_employee(employee):
        return None, forbidden_response(
            "Gamification is not enabled for your organization."
        )

    return employee, None


def require_company_gamification(request) -> tuple:
    """
    Returns (employee, None) when the caller's company has gamification enabled.
    Used for manager/admin endpoints that are not limited to the learner summary flow.
    """
    employee = get_request_employee(request.user)
    if error := _require_gamification_employee(employee):
        return None, error

    if not GamificationStatusService().is_globally_enabled():
        return None, forbidden_response("Gamification is not enabled.")

    if not GamificationStatusService().is_enabled_for_company(employee.company_id):
        return None, forbidden_response(
            "Gamification is not enabled for your organization."
        )

    return employee, None


def require_gamification_admin(request) -> tuple:
    """
    Returns (employee, None) for config/rule management.
    Requires global feature flag only — company may still be disabled so admins can turn it on.
    """
    employee = get_request_employee(request.user)
    if error := _require_gamification_employee(employee):
        return None, error

    if not GamificationStatusService().is_globally_enabled():
        return None, forbidden_response("Gamification is not enabled.")

    return employee, None


def _require_gamification_employee(employee):
    if not employee:
        return error_response(
            message="Employee profile is required to access gamification.",
            status_code=403,
        )
    return None
