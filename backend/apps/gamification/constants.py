"""
Gamification constants — single source of truth for codes and defaults.
"""


class FeatureKeys:
    GAMIFICATION_ENABLED = "gamification_enabled"


class GamificationDefaults:
    """Default values for company GamificationConfig (overridable per company)."""

    INACTIVE_LEADERBOARD_DAYS = 90
    LEARNING_STREAK_MIN_SECONDS = 300
    MANDATORY_COURSE_XP_MULTIPLIER = 1.5
    RETAKE_XP_PERCENT_2ND = 40
    RETAKE_XP_PERCENT_3RD_PLUS = 20
    STREAK_DAILY_XP_BONUS = 10


class AwardEventType:
    COURSE = "COURSE"
    ASSESSMENT = "ASSESSMENT"
    SKILL = "SKILL"
    CERTIFICATE = "CERTIFICATE"
    STREAK = "STREAK"


class AwardRuleCode:
    COURSE_COMPLETED = "COURSE_COMPLETED"
    ASSESSMENT_PASSED = "ASSESSMENT_PASSED"
    SKILL_UPGRADE_APPROVED = "SKILL_UPGRADE_APPROVED"
    CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED"
    STREAK_DAY_BONUS = "STREAK_DAY_BONUS"


class PointSourceType:
    ENROLLMENT = "ENROLLMENT"
    ASSESSMENT_RESULT = "ASSESSMENT_RESULT"
    SKILL_UPGRADE_PROPOSAL = "SKILL_UPGRADE_PROPOSAL"
    ISSUED_CERTIFICATE = "ISSUED_CERTIFICATE"
    STREAK = "STREAK"


class LeaderboardPeriod:
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"
    CHOICES = (WEEKLY, MONTHLY, ALL_TIME)
    DEFAULT = ALL_TIME


AWARD_RULE_LABELS = {
    AwardRuleCode.COURSE_COMPLETED: "Course completed",
    AwardRuleCode.ASSESSMENT_PASSED: "Assessment passed",
    AwardRuleCode.SKILL_UPGRADE_APPROVED: "Skill upgrade approved",
    AwardRuleCode.CERTIFICATE_ISSUED: "Certificate issued",
    AwardRuleCode.STREAK_DAY_BONUS: "Streak day bonus",
}
