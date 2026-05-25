"""
Gamification API views.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.gamification.serializers import (
    GamificationHealthSerializer,
    GamificationSummarySerializer,
    PointTransactionSerializer,
)
from apps.gamification.services import GamificationStatusService, LearnerGamificationService
from apps.gamification.view_helpers import get_request_employee, require_active_gamification
from apps.rbac.permission_codes import P
from apps.rbac.permissions import HasScopedPermission
from common.pagination import StandardResultsPagination
from common.response import success_response


def _resolve_company_id(user) -> int | None:
    employee = get_request_employee(user)
    if employee is None:
        return None
    return employee.company_id


class GamificationHealthAPIView(APIView):
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


class MeGamificationViewSet(viewsets.GenericViewSet):
    """
    Learner gamification endpoints scoped to the authenticated employee.
    """

    permission_classes = [HasScopedPermission]
    required_permission = P.GAMIFICATION.VIEW_OWN
    pagination_class = StandardResultsPagination
    serializer_class = PointTransactionSerializer

    def _get_service(self) -> LearnerGamificationService:
        return LearnerGamificationService()

    @extend_schema(
        summary="Gamification summary for current learner",
        responses={200: GamificationSummarySerializer},
    )
    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        summary_data = self._get_service().build_summary(employee)
        serializer = GamificationSummarySerializer(
            {
                "lifetime_xp": summary_data["lifetime_xp"],
                "rank": summary_data["rank"],
                "pool_size": summary_data["pool_size"],
                "badges_count": summary_data["badges_count"],
                "streaks": summary_data["streaks"],
                "recent_transactions": summary_data["recent_transactions"],
            }
        )
        return success_response(
            message="Gamification summary retrieved",
            data=serializer.data,
        )

    @extend_schema(
        summary="Paginated XP transaction history for current learner",
        responses={200: PointTransactionSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="transactions")
    def transactions(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        qs = self._get_service().transactions_queryset(employee.id)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = PointTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PointTransactionSerializer(qs, many=True)
        return success_response(
            message="Transactions retrieved",
            data=serializer.data,
        )
