from decimal import Decimal

from rest_framework import serializers

from apps.gamification.constants import AWARD_RULE_LABELS
from apps.gamification.models import AwardRule, CompanyGamificationConfig, PointTransaction


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


class StreakSnapshotSerializer(serializers.Serializer):
    current = serializers.IntegerField()
    longest = serializers.IntegerField()


class StreaksSerializer(serializers.Serializer):
    learning = StreakSnapshotSerializer()
    pass_daily = StreakSnapshotSerializer()
    attempt_daily = StreakSnapshotSerializer()
    pass_consecutive = StreakSnapshotSerializer()


class PointTransactionSerializer(serializers.ModelSerializer):
    rule_label = serializers.SerializerMethodField()

    class Meta:
        model = PointTransaction
        fields = [
            "id",
            "amount",
            "rule_code",
            "rule_label",
            "source_type",
            "source_id",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields

    def get_rule_label(self, obj) -> str:
        return AWARD_RULE_LABELS.get(obj.rule_code, obj.rule_code.replace("_", " ").title())


class GamificationSummarySerializer(serializers.Serializer):
    lifetime_xp = serializers.IntegerField()
    rank = serializers.IntegerField()
    pool_size = serializers.IntegerField()
    badges_count = serializers.IntegerField()
    streaks = StreaksSerializer()
    recent_transactions = PointTransactionSerializer(many=True)


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    employee_id = serializers.IntegerField()
    employee_code = serializers.CharField()
    display_name = serializers.CharField()
    department_name = serializers.CharField()
    business_unit_name = serializers.CharField()
    designation_name = serializers.CharField()
    period_xp = serializers.IntegerField()
    badges_count = serializers.IntegerField()


class LeaderboardMyRankSerializer(serializers.Serializer):
    rank = serializers.IntegerField(allow_null=True)
    period_xp = serializers.IntegerField()
    pool_size = serializers.IntegerField()


class BadgeCatalogItemSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    criteria_type = serializers.CharField()
    icon_key = serializers.CharField()
    sort_order = serializers.IntegerField()
    is_earned = serializers.BooleanField()


class EarnedBadgeSerializer(BadgeCatalogItemSerializer):
    earned_at = serializers.DateTimeField()


class BadgeCatalogResponseSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = BadgeCatalogItemSerializer(many=True)


class TeamGamificationMemberSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    employee_code = serializers.CharField()
    display_name = serializers.CharField()
    department_name = serializers.CharField()
    designation_name = serializers.CharField()
    lifetime_xp = serializers.IntegerField()
    rank = serializers.IntegerField()
    badges_count = serializers.IntegerField()
    streaks = StreaksSerializer()


class TeamGamificationDetailSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    employee_code = serializers.CharField()
    display_name = serializers.CharField()
    department_name = serializers.CharField()
    designation_name = serializers.CharField()
    lifetime_xp = serializers.IntegerField()
    rank = serializers.IntegerField()
    pool_size = serializers.IntegerField()
    badges_count = serializers.IntegerField()
    streaks = StreaksSerializer()
    badges = EarnedBadgeSerializer(many=True)
    recent_transactions = PointTransactionSerializer(many=True)


class AwardRuleSerializer(serializers.ModelSerializer):
    is_company_override = serializers.SerializerMethodField()

    class Meta:
        model = AwardRule
        fields = [
            "id",
            "code",
            "name",
            "event_type",
            "base_points",
            "multiplier",
            "company",
            "is_active",
            "is_company_override",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "code", "event_type", "company", "created_at", "updated_at"]

    def get_is_company_override(self, obj) -> bool:
        return obj.company_id is not None


class AwardRuleUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=128)
    base_points = serializers.IntegerField(required=False, min_value=0)
    multiplier = serializers.DecimalField(
        required=False, max_digits=6, decimal_places=2, min_value=Decimal("0")
    )
    is_active = serializers.BooleanField(required=False)


class LeaderboardResponseSerializer(serializers.Serializer):
    period = serializers.CharField()
    department_id = serializers.IntegerField(allow_null=True)
    business_unit_id = serializers.IntegerField(allow_null=True)
    designation_id = serializers.IntegerField(allow_null=True)
    my_rank = LeaderboardMyRankSerializer()
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = LeaderboardEntrySerializer(many=True)
