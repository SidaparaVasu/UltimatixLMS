"""
Notifications serializers.

Rules:
    - Read serializer exposes all fields the frontend needs for rendering.
    - Write serializers are minimal — creation is service-only, not via API input.
    - Sensitive data must never appear in any serializer output.
"""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Full read serializer for a single notification.
    Used in list, retrieve, and mark-read responses.
    """

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "action_url",
            "entity_type",
            "entity_id",
            "is_read",
            "read_at",
            "sent_at",
        ]
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    """
    Response shape for GET /notifications/unread-count/.
    Powers the bell badge — intentionally minimal.
    """
    count = serializers.IntegerField(min_value=0)


class MarkAllReadResponseSerializer(serializers.Serializer):
    """
    Response shape for POST /notifications/mark-all-read/.
    """
    updated = serializers.IntegerField(
        min_value=0,
        help_text="Number of notifications marked as read.",
    )
