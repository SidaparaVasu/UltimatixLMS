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


class AwardRule(models.Model):
    code = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=128)
    event_type = models.CharField(max_length=32, db_index=True)
    base_points = models.PositiveIntegerField()
    multiplier = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="gamification_award_rules",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gamification_award_rule"
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(
                fields=["code", "company"],
                name="uniq_gamification_award_rule_code_company",
            ),
        ]

    def __str__(self):
        return self.code


class PointBalance(models.Model):
    employee = models.OneToOneField(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="point_balance",
    )
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="employee_point_balances",
    )
    lifetime_xp = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gamification_point_balance"
        indexes = [
            models.Index(fields=["company", "-lifetime_xp"], name="idx_gami_balance_co_xp"),
        ]

    def __str__(self):
        return f"PointBalance(employee={self.employee_id}, xp={self.lifetime_xp})"


class PointTransaction(models.Model):
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="point_transactions",
    )
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="point_transactions",
    )
    amount = models.IntegerField()
    rule_code = models.CharField(max_length=64, db_index=True)
    source_type = models.CharField(max_length=64, db_index=True)
    source_id = models.BigIntegerField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gamification_point_transaction"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["employee", "-created_at"], name="idx_gami_pt_emp_created"),
            models.Index(fields=["company", "-created_at"], name="idx_gami_pt_co_created"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "rule_code", "source_type", "source_id"],
                name="uniq_gamification_point_award",
            ),
        ]

    def __str__(self):
        return f"PointTransaction({self.rule_code}, {self.amount}, employee={self.employee_id})"
