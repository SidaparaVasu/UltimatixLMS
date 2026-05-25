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
