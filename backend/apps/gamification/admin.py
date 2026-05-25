from django.contrib import admin

from apps.gamification.models import (
    AwardRule,
    CompanyGamificationConfig,
    PointBalance,
    PointTransaction,
)


@admin.register(CompanyGamificationConfig)
class CompanyGamificationConfigAdmin(admin.ModelAdmin):
    list_display = (
        "company",
        "is_enabled",
        "inactive_leaderboard_days",
        "learning_streak_min_seconds",
        "updated_at",
    )
    list_filter = ("is_enabled",)
    search_fields = ("company__company_name",)


@admin.register(AwardRule)
class AwardRuleAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "event_type", "base_points", "multiplier", "company", "is_active")
    list_filter = ("event_type", "is_active", "company")
    search_fields = ("code", "name")


@admin.register(PointBalance)
class PointBalanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "company", "lifetime_xp", "updated_at")
    list_filter = ("company",)
    search_fields = ("employee__employee_code", "employee__email")


@admin.register(PointTransaction)
class PointTransactionAdmin(admin.ModelAdmin):
    list_display = ("employee", "amount", "rule_code", "source_type", "source_id", "created_at")
    list_filter = ("rule_code", "source_type", "company")
    search_fields = ("employee__employee_code", "rule_code")
    readonly_fields = ("created_at",)
