"""
Notifications views.

Endpoints:
    GET    /api/v1/notifications/                   → paginated list
    GET    /api/v1/notifications/{id}/              → single notification
    GET    /api/v1/notifications/unread-count/      → bell badge count
    PATCH  /api/v1/notifications/{id}/read/         → mark single as read
    POST   /api/v1/notifications/mark-all-read/     → mark all as read
    DELETE /api/v1/notifications/{id}/              → delete single

Rules:
    - Every endpoint is scoped to request.user — no cross-user access.
    - No endpoint allows creating notifications (service/signal only).
    - Superusers are still scoped to their own notifications.
"""

import logging

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from common.response import (
    success_response,
    error_response,
    not_found_response,
)
from .models import Notification
from .serializers import (
    NotificationSerializer,
    UnreadCountSerializer,
    MarkAllReadResponseSerializer,
)
from .services.notification_service import NotificationService
from .constants import LEARNING_TYPES, APPROVAL_TYPES, ALERT_TYPES

logger = logging.getLogger(__name__)

# Map frontend filter tab names → notification type lists
_TAB_TYPE_MAP = {
    "learning":  [t.value for t in LEARNING_TYPES],
    "approvals": [t.value for t in APPROVAL_TYPES],
    "alerts":    [t.value for t in ALERT_TYPES],
}


class NotificationViewSet(viewsets.GenericViewSet):
    """
    In-app notification endpoints.

    All actions are scoped to the authenticated user.
    Notifications are created by signals and services — never via this API.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def _get_service(self) -> NotificationService:
        return NotificationService()

    def get_queryset(self):
        """Base queryset — always scoped to the current user."""
        return Notification.objects.filter(user=self.request.user)

    # ------------------------------------------------------------------
    # GET /notifications/
    # ------------------------------------------------------------------

    @extend_schema(
        summary="List notifications",
        description=(
            "Returns a paginated list of notifications for the authenticated user, "
            "newest first. Supports filtering by read state and tab category."
        ),
        parameters=[
            OpenApiParameter(
                name="is_read",
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description="Filter by read state. Omit to return all.",
                required=False,
            ),
            OpenApiParameter(
                name="tab",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description=(
                    "Frontend tab filter. One of: learning, approvals, alerts. "
                    "Omit to return all types."
                ),
                required=False,
            ),
        ],
        responses={200: NotificationSerializer(many=True)},
    )
    def list(self, request):
        """
        GET /api/v1/notifications/

        Query params:
            is_read (bool, optional) — true/false
            tab     (str, optional)  — learning | approvals | alerts
        """
        # Parse is_read filter
        is_read_param = request.query_params.get("is_read")
        is_read = None
        if is_read_param is not None:
            is_read = is_read_param.lower() in ("true", "1", "yes")

        # Parse tab filter → notification type list
        tab = request.query_params.get("tab", "").lower()
        notification_types = _TAB_TYPE_MAP.get(tab)  # None if tab not in map → no type filter

        svc = self._get_service()
        qs = svc.get_notifications(
            user_id=request.user.id,
            is_read=is_read,
            notification_types=notification_types,
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return success_response(data=serializer.data)

    # ------------------------------------------------------------------
    # GET /notifications/{id}/
    # ------------------------------------------------------------------

    @extend_schema(
        summary="Retrieve a single notification",
        responses={200: NotificationSerializer},
    )
    def retrieve(self, request, pk=None):
        """GET /api/v1/notifications/{id}/"""
        try:
            notif = self.get_queryset().get(pk=pk)
        except Notification.DoesNotExist:
            return not_found_response("Notification not found.")
        serializer = self.get_serializer(notif)
        return success_response(data=serializer.data)

    # ------------------------------------------------------------------
    # GET /notifications/unread-count/
    # ------------------------------------------------------------------

    @extend_schema(
        summary="Get unread notification count",
        description="Returns the count of unread notifications. Used to power the bell badge.",
        responses={200: UnreadCountSerializer},
    )
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """GET /api/v1/notifications/unread-count/"""
        svc = self._get_service()
        count = svc.get_unread_count(user_id=request.user.id)
        return success_response(data={"count": count})

    # ------------------------------------------------------------------
    # PATCH /notifications/{id}/read/
    # ------------------------------------------------------------------

    @extend_schema(
        summary="Mark a single notification as read",
        responses={200: NotificationSerializer},
    )
    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        """PATCH /api/v1/notifications/{id}/read/"""
        svc = self._get_service()
        notif = svc.mark_read(notification_id=pk, user_id=request.user.id)
        if notif is None:
            return not_found_response("Notification not found.")
        serializer = self.get_serializer(notif)
        return success_response(
            message="Notification marked as read.",
            data=serializer.data,
        )

    # ------------------------------------------------------------------
    # POST /notifications/mark-all-read/
    # ------------------------------------------------------------------

    @extend_schema(
        summary="Mark all notifications as read",
        description="Marks every unread notification for the current user as read.",
        responses={200: MarkAllReadResponseSerializer},
    )
    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """POST /api/v1/notifications/mark-all-read/"""
        svc = self._get_service()
        updated = svc.mark_all_read(user_id=request.user.id)
        return success_response(
            message=f"{updated} notification{'s' if updated != 1 else ''} marked as read.",
            data={"updated": updated},
        )

    # ------------------------------------------------------------------
    # DELETE /notifications/{id}/
    # ------------------------------------------------------------------

    @extend_schema(
        summary="Delete a notification",
        description="Permanently deletes a single notification owned by the current user.",
        responses={200: None},
    )
    def destroy(self, request, pk=None):
        """DELETE /api/v1/notifications/{id}/"""
        svc = self._get_service()
        deleted = svc.delete_notification(
            notification_id=pk, user_id=request.user.id
        )
        if not deleted:
            return not_found_response("Notification not found.")
        return success_response(message="Notification deleted.")
