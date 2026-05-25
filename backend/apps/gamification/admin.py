from django.contrib import admin

from apps.gamification.models import CompanyGamificationConfig


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
