"""
Gamification API views.

"""

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from common.response import success_response
from apps.gamification.serializers import GamificationHealthSerializer
from apps.gamification.services import GamificationStatusService


def _resolve_company_id(user) -> int | None:
    employee = getattr(user, "employee_record", None)
    if employee is None:
        return None
    return getattr(employee, "company_id", None)


class GamificationHealthAPIView(APIView):
    """
    GET /api/v1/gamification/health/

    Returns module readiness and whether gamification is active for the caller's company.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: GamificationHealthSerializer})
    def get(self, request):
        service = GamificationStatusService()
        company_id = _resolve_company_id(request.user)
        status_data = service.get_status_payload(company_id)
        payload = {"status": "ok", **status_data}
        serializer = GamificationHealthSerializer(payload)
        return success_response(
            message="Gamification module is available",
            data=serializer.data,
        )
