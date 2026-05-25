from rest_framework import serializers

from apps.gamification.models import CompanyGamificationConfig


class GamificationHealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    module = serializers.CharField()
    phase = serializers.IntegerField()
    global_feature_enabled = serializers.BooleanField()
    company_enabled = serializers.BooleanField()
    active = serializers.BooleanField()


class CompanyGamificationConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyGamificationConfig
        fields = [
            "id",
            "company",
            "is_enabled",
            "inactive_leaderboard_days",
            "learning_streak_min_seconds",
            "mandatory_course_xp_multiplier",
            "retake_xp_percent_2nd",
            "retake_xp_percent_3rd_plus",
            "streak_daily_xp_bonus",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "company", "created_at", "updated_at"]
