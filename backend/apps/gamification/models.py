"""
Gamification models.

company-level configuration only.
Ledger, badges, and streaks are added in later.
"""

from django.db import models

from apps.gamification.constants import GamificationDefaults


class CompanyGamificationConfig(models.Model):
    """
    Per-company gamification settings.

    One row per company; created on demand when an admin opens config
    or when the first award runs for that company.
    """

    company = models.OneToOneField(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="gamification_config",
    )
    is_enabled = models.BooleanField(
        default=False,
        help_text="Company-level toggle; also requires global feature flag gamification_enabled.",
    )
    inactive_leaderboard_days = models.PositiveSmallIntegerField(
        default=GamificationDefaults.INACTIVE_LEADERBOARD_DAYS,
    )
    learning_streak_min_seconds = models.PositiveIntegerField(
        default=GamificationDefaults.LEARNING_STREAK_MIN_SECONDS,
    )
    mandatory_course_xp_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=GamificationDefaults.MANDATORY_COURSE_XP_MULTIPLIER,
    )
    retake_xp_percent_2nd = models.PositiveSmallIntegerField(
        default=GamificationDefaults.RETAKE_XP_PERCENT_2ND,
    )
    retake_xp_percent_3rd_plus = models.PositiveSmallIntegerField(
        default=GamificationDefaults.RETAKE_XP_PERCENT_3RD_PLUS,
    )
    streak_daily_xp_bonus = models.PositiveSmallIntegerField(
        default=GamificationDefaults.STREAK_DAILY_XP_BONUS,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gamification_company_config"
        verbose_name = "Company Gamification Config"
        verbose_name_plural = "Company Gamification Configs"

    def __str__(self):
        return f"GamificationConfig(company={self.company_id})"
