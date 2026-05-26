"""
Gamification models.

company-level configuration only.
Ledger, badges, and streaks.
"""

from django.db import models

from apps.gamification.constants import BadgeCategory, GamificationDefaults


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


class EmployeeStreak(models.Model):
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="gamification_streaks",
    )
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="employee_streaks",
    )
    streak_type = models.CharField(max_length=32, db_index=True)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gamification_employee_streak"
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "streak_type"],
                name="uniq_gamification_employee_streak",
            ),
        ]

    def __str__(self):
        return f"EmployeeStreak({self.employee_id}, {self.streak_type}, {self.current_streak})"


class StreakActivityLog(models.Model):
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="streak_activity_logs",
    )
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="streak_activity_logs",
    )
    streak_type = models.CharField(max_length=32, db_index=True)
    activity_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gamification_streak_activity_log"
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "streak_type", "activity_date"],
                name="uniq_gamification_streak_activity_day",
            ),
        ]
        ordering = ["-activity_date"]

    def __str__(self):
        return f"StreakActivityLog({self.employee_id}, {self.streak_type}, {self.activity_date})"


class BadgeDefinition(models.Model):
    code = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=32, choices=BadgeCategory.CHOICES, db_index=True)
    criteria_type = models.CharField(max_length=64, db_index=True)
    criteria_value = models.JSONField(default=dict, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    icon_key = models.CharField(max_length=64, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gamification_badge_definition"
        ordering = ["sort_order", "code"]

    def __str__(self):
        return self.code


class EmployeeBadge(models.Model):
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="earned_badges",
    )
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="employee_badges",
    )
    badge = models.ForeignKey(
        BadgeDefinition,
        on_delete=models.CASCADE,
        related_name="employee_awards",
    )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gamification_employee_badge"
        ordering = ["-earned_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "badge"],
                name="uniq_gamification_employee_badge",
            ),
        ]
        indexes = [
            models.Index(fields=["employee", "-earned_at"], name="idx_gami_badge_emp_earned"),
        ]

    def __str__(self):
        return f"EmployeeBadge({self.employee_id}, {self.badge_id})"


class EmployeeCelebrationAck(models.Model):
    """
    Last gamification state the learner has seen in celebration modals.
    Used to compute pending celebrations across sessions/devices.
    """

    employee = models.OneToOneField(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="gamification_celebration_ack",
    )
    company = models.ForeignKey(
        "org_management.CompanyMaster",
        on_delete=models.CASCADE,
        related_name="celebration_acks",
    )
    snapshot = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "gamification_employee_celebration_ack"

    def __str__(self):
        return f"CelebrationAck(employee={self.employee_id})"
