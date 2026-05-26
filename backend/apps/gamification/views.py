"""
Gamification API views.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.gamification.constants import LeaderboardPeriod
from apps.gamification.serializers import (
    AwardRuleSerializer,
    AwardRuleUpdateSerializer,
    BadgeCatalogItemSerializer,
    BadgeCatalogResponseSerializer,
    CompanyGamificationConfigSerializer,
    EarnedBadgeSerializer,
    GamificationHealthSerializer,
    GamificationSummarySerializer,
    AcknowledgeCelebrationsRequestSerializer,
    PendingCelebrationsResponseSerializer,
    LeaderboardResponseSerializer,
    PointTransactionSerializer,
    TeamGamificationDetailSerializer,
    TeamGamificationMemberSerializer,
)
from apps.gamification.services import (
    BadgeCatalogService,
    GamificationAdminService,
    GamificationStatusService,
    LeaderboardService,
    LearnerGamificationService,
    PendingCelebrationService,
    TeamGamificationService,
)
from apps.gamification.view_helpers import (
    get_request_employee,
    require_active_gamification,
    require_company_gamification,
    require_gamification_admin,
)
from apps.rbac.permission_codes import P
from apps.rbac.permissions import HasScopedPermission
from common.pagination import StandardResultsPagination
from common.response import error_response, not_found_response, success_response


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

    @extend_schema(
        summary="Earned badges for current learner",
        responses={200: EarnedBadgeSerializer(many=True)},
    )
    @action(detail=False, methods=["get"], url_path="badges")
    def badges(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        rows = BadgeCatalogService().list_earned_badges(employee.id)
        serializer = EarnedBadgeSerializer(rows, many=True)
        return success_response(
            message="Earned badges retrieved",
            data=serializer.data,
        )

    @extend_schema(
        summary="Pending celebration modals since last acknowledgement",
        responses={200: PendingCelebrationsResponseSerializer},
    )
    @action(detail=False, methods=["get"], url_path="pending-celebrations")
    def pending_celebrations(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        payload = PendingCelebrationService().get_pending(employee)
        serializer = PendingCelebrationsResponseSerializer(payload)
        return success_response(
            message="Pending celebrations retrieved",
            data=serializer.data,
        )

    @extend_schema(
        summary="Acknowledge current gamification state (dismiss pending celebrations)",
        request=AcknowledgeCelebrationsRequestSerializer,
        responses={200: PendingCelebrationsResponseSerializer},
    )
    @action(detail=False, methods=["post"], url_path="pending-celebrations/ack")
    def acknowledge_celebrations(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        service = PendingCelebrationService()
        body = AcknowledgeCelebrationsRequestSerializer(data=request.data or {})
        body.is_valid(raise_exception=True)
        snapshot_payload = body.validated_data.get("snapshot")
        snapshot = service.save_ack(employee, snapshot_payload)
        return success_response(
            message="Celebrations acknowledged",
            data={
                "needs_baseline": False,
                "events": [],
                "snapshot": snapshot,
            },
        )


class BadgeGamificationViewSet(viewsets.GenericViewSet):
    permission_classes = [HasScopedPermission]
    required_permission = P.GAMIFICATION.VIEW_OWN

    @extend_schema(
        summary="Badge catalog with earned state for current learner",
        responses={200: BadgeCatalogResponseSerializer},
    )
    @action(detail=False, methods=["get"], url_path="catalog")
    def catalog(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        results = BadgeCatalogService().build_catalog(employee.id)
        serializer = BadgeCatalogItemSerializer(results, many=True)
        return success_response(
            message="Badge catalog retrieved",
            data={
                "count": len(results),
                "results": serializer.data,
            },
        )


def _parse_optional_int(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class LeaderboardViewSet(viewsets.GenericViewSet):
    permission_classes = [HasScopedPermission]
    required_permission = P.GAMIFICATION.VIEW_LEADERBOARD
    pagination_class = StandardResultsPagination

    def _get_service(self) -> LeaderboardService:
        return LeaderboardService()

    def _filter_params(self, request) -> dict:
        return {
            "period": request.query_params.get("period"),
            "department_id": _parse_optional_int(request.query_params.get("department_id")),
            "business_unit_id": _parse_optional_int(request.query_params.get("business_unit_id")),
            "designation_id": _parse_optional_int(request.query_params.get("designation_id")),
        }

    @extend_schema(
        summary="Company leaderboard",
        parameters=[
            OpenApiParameter("period", OpenApiTypes.STR, enum=list(LeaderboardPeriod.CHOICES)),
            OpenApiParameter("department_id", OpenApiTypes.INT, required=False),
            OpenApiParameter("business_unit_id", OpenApiTypes.INT, required=False),
            OpenApiParameter("designation_id", OpenApiTypes.INT, required=False),
        ],
        responses={200: LeaderboardResponseSerializer},
    )
    def list(self, request):
        employee, error = require_active_gamification(request)
        if error:
            return error

        filters = self._filter_params(request)
        service = self._get_service()
        period = service._normalize_period(filters["period"])

        qs = service.build_leaderboard_queryset(
            employee.company_id,
            period=period,
            department_id=filters["department_id"],
            business_unit_id=filters["business_unit_id"],
            designation_id=filters["designation_id"],
        )

        rank_info = service.resolve_rank(
            employee.company_id,
            employee.id,
            period=period,
            department_id=filters["department_id"],
            business_unit_id=filters["business_unit_id"],
            designation_id=filters["designation_id"],
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        rank_offset = 0
        if page is not None and paginator.page.number > 1:
            rank_offset = (paginator.page.number - 1) * paginator.get_page_size(request)

        if page is not None:
            results = service.serialize_entries(page, rank_offset=rank_offset)
            payload = {
                "period": period,
                "department_id": filters["department_id"],
                "business_unit_id": filters["business_unit_id"],
                "designation_id": filters["designation_id"],
                "my_rank": {
                    "rank": rank_info["rank"] if rank_info else None,
                    "period_xp": rank_info["period_xp"] if rank_info else 0,
                    "pool_size": rank_info["pool_size"] if rank_info else 0,
                },
                "count": paginator.page.paginator.count,
                "next": paginator.get_next_link(),
                "previous": paginator.get_previous_link(),
                "results": results,
            }
            return Response({"success": True, "data": payload})

        results = service.serialize_entries(qs)
        return success_response(
            message="Leaderboard retrieved",
            data={
                "period": period,
                "department_id": filters["department_id"],
                "business_unit_id": filters["business_unit_id"],
                "designation_id": filters["designation_id"],
                "my_rank": {
                    "rank": rank_info["rank"] if rank_info else None,
                    "period_xp": rank_info["period_xp"] if rank_info else 0,
                    "pool_size": rank_info["pool_size"] if rank_info else 0,
                },
                "count": len(results),
                "next": None,
                "previous": None,
                "results": results,
            },
        )


class TeamGamificationViewSet(viewsets.GenericViewSet):
    permission_classes = [HasScopedPermission]
    required_permission = P.GAMIFICATION.VIEW_TEAM
    pagination_class = StandardResultsPagination

    def _get_service(self) -> TeamGamificationService:
        return TeamGamificationService()

    @extend_schema(
        summary="Gamification overview for manager's reports",
        responses={200: TeamGamificationMemberSerializer(many=True)},
    )
    def list(self, request):
        manager, error = require_company_gamification(request)
        if error:
            return error

        rows = self._get_service().build_team_list(manager)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(rows, request)
        if page is not None:
            serializer = TeamGamificationMemberSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = TeamGamificationMemberSerializer(rows, many=True)
        return success_response(
            message="Team gamification retrieved",
            data=serializer.data,
        )

    @extend_schema(
        summary="Gamification detail for a direct or indirect report",
        responses={200: TeamGamificationDetailSerializer},
    )
    def retrieve(self, request, pk=None):
        manager, error = require_company_gamification(request)
        if error:
            return error

        try:
            target_id = int(pk)
        except (TypeError, ValueError):
            return error_response(message="Invalid employee id.", status_code=400)

        detail = self._get_service().build_member_detail(manager, target_id)
        if detail is None:
            return not_found_response("Employee not found in your reporting hierarchy.")

        serializer = TeamGamificationDetailSerializer(detail)
        return success_response(
            message="Team member gamification retrieved",
            data=serializer.data,
        )


class GamificationConfigAPIView(APIView):
    permission_classes = [HasScopedPermission]
    required_permission = P.GAMIFICATION.MANAGE_CONFIG

    @extend_schema(
        summary="Get company gamification configuration",
        responses={200: CompanyGamificationConfigSerializer},
    )
    def get(self, request):
        employee, error = require_gamification_admin(request)
        if error:
            return error

        config = GamificationAdminService().get_company_config(employee.company_id)
        serializer = CompanyGamificationConfigSerializer(config)
        return success_response(
            message="Gamification configuration retrieved",
            data=serializer.data,
        )

    @extend_schema(
        summary="Update company gamification configuration",
        request=CompanyGamificationConfigSerializer,
        responses={200: CompanyGamificationConfigSerializer},
    )
    def patch(self, request):
        employee, error = require_gamification_admin(request)
        if error:
            return error

        serializer = CompanyGamificationConfigSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        config = GamificationAdminService().update_company_config(
            employee.company_id,
            serializer.validated_data,
        )
        return success_response(
            message="Gamification configuration updated",
            data=CompanyGamificationConfigSerializer(config).data,
        )


class GamificationRulesViewSet(viewsets.GenericViewSet):
    permission_classes = [HasScopedPermission]
    required_permission = P.GAMIFICATION.MANAGE_CONFIG
    serializer_class = AwardRuleSerializer

    @extend_schema(
        summary="List award rules for the company",
        responses={200: AwardRuleSerializer(many=True)},
    )
    def list(self, request):
        employee, error = require_gamification_admin(request)
        if error:
            return error

        rules = GamificationAdminService().list_award_rules(employee.company_id)
        serializer = AwardRuleSerializer(rules, many=True)
        return success_response(
            message="Award rules retrieved",
            data=serializer.data,
        )

    @extend_schema(
        summary="Update a company award rule override",
        request=AwardRuleUpdateSerializer,
        responses={200: AwardRuleSerializer},
    )
    def partial_update(self, request, pk=None):
        employee, error = require_gamification_admin(request)
        if error:
            return error

        update_serializer = AwardRuleUpdateSerializer(data=request.data, partial=True)
        update_serializer.is_valid(raise_exception=True)

        rule = GamificationAdminService().update_award_rule(
            employee.company_id,
            int(pk),
            update_serializer.validated_data,
        )
        if rule is None:
            return not_found_response("Award rule not found.")

        return success_response(
            message="Award rule updated",
            data=AwardRuleSerializer(rule).data,
        )
