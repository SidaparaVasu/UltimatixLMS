from django.contrib import admin

from apps.gamification.models import (
    AwardRule,
    BadgeDefinition,
    CompanyGamificationConfig,
    EmployeeBadge,
    EmployeeStreak,
    PointBalance,
    PointTransaction,
    StreakActivityLog,
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


@admin.register(BadgeDefinition)
class BadgeDefinitionAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "criteria_type", "sort_order", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("code", "name")


@admin.register(EmployeeBadge)
class EmployeeBadgeAdmin(admin.ModelAdmin):
    list_display = ("employee", "badge", "company", "earned_at")
    list_filter = ("company", "badge__category")
    search_fields = ("employee__employee_code", "badge__code")


@admin.register(EmployeeStreak)
class EmployeeStreakAdmin(admin.ModelAdmin):
    list_display = ("employee", "streak_type", "current_streak", "longest_streak", "last_activity_date")
    list_filter = ("streak_type", "company")
    search_fields = ("employee__employee_code",)


@admin.register(StreakActivityLog)
class StreakActivityLogAdmin(admin.ModelAdmin):
    list_display = ("employee", "streak_type", "activity_date", "created_at")
    list_filter = ("streak_type",)
    search_fields = ("employee__employee_code",)


@admin.register(PointTransaction)
class PointTransactionAdmin(admin.ModelAdmin):
    list_display = ("employee", "amount", "rule_code", "source_type", "source_id", "created_at")
    list_filter = ("rule_code", "source_type", "company")
    search_fields = ("employee__employee_code", "rule_code")
    readonly_fields = ("created_at",)
