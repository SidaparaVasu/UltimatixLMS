"""
Notifications constants.

All ENUM values used in models and services are defined here.

Rules:
    - Never use raw strings for enum values in code.
    - Always import from this file.
"""

from django.db import models


class NotificationType(models.TextChoices):
    # -----------------------------------------------------------------------
    # Learner notifications
    # -----------------------------------------------------------------------
    ENROLLMENT        = "ENROLLMENT",        "Course Enrolled"
    COMPLETION        = "COMPLETION",        "Course Completed"
    CERTIFICATE       = "CERTIFICATE",       "Certificate Issued"
    ASSESSMENT_RESULT = "ASSESSMENT_RESULT", "Assessment Result"
    SKILL_UPGRADE     = "SKILL_UPGRADE",     "Skill Upgrade Proposal"

    # -----------------------------------------------------------------------
    # TNI / Skill notifications
    # -----------------------------------------------------------------------
    TNI_APPROVAL       = "TNI_APPROVAL",       "Training Need Approved"
    TNI_REJECTION      = "TNI_REJECTION",      "Training Need Rejected"
    TNI_PENDING_REVIEW = "TNI_PENDING_REVIEW", "Training Need Pending Review"
    SKILL_RATING       = "SKILL_RATING",       "Skill Rating Submitted"
    RATING_CYCLE_OPEN  = "RATING_CYCLE_OPEN",  "Rating Cycle Opened"

    # -----------------------------------------------------------------------
    # Training plan / approval notifications
    # -----------------------------------------------------------------------
    PLAN_PENDING_APPROVAL = "PLAN_PENDING_APPROVAL", "Training Plan Pending Approval"
    PLAN_APPROVED         = "PLAN_APPROVED",         "Training Plan Approved"
    PLAN_REJECTED         = "PLAN_REJECTED",         "Training Plan Rejected"

    # -----------------------------------------------------------------------
    # Session notifications
    # -----------------------------------------------------------------------
    SESSION_ENROLLED = "SESSION_ENROLLED", "Training Session Enrolled"
    SESSION_REMINDER = "SESSION_REMINDER", "Training Session Reminder"

    # -----------------------------------------------------------------------
    # Compliance / admin notifications
    # -----------------------------------------------------------------------
    COMPLIANCE_EXPIRY = "COMPLIANCE_EXPIRY", "Compliance Training Expiring"
    COMPLIANCE_ALERT  = "COMPLIANCE_ALERT",  "Compliance Alert (Admin)"
    NEW_ENROLLMENT    = "NEW_ENROLLMENT",    "New Enrollment (Admin)"
    TEAM_COMPLETION   = "TEAM_COMPLETION",   "Team Member Completed Course"


# ---------------------------------------------------------------------------
# Groupings used by the frontend filter tabs
# ---------------------------------------------------------------------------
LEARNING_TYPES = [
    NotificationType.ENROLLMENT,
    NotificationType.COMPLETION,
    NotificationType.CERTIFICATE,
    NotificationType.ASSESSMENT_RESULT,
]

APPROVAL_TYPES = [
    NotificationType.TNI_APPROVAL,
    NotificationType.TNI_REJECTION,
    NotificationType.TNI_PENDING_REVIEW,
    NotificationType.PLAN_PENDING_APPROVAL,
    NotificationType.PLAN_APPROVED,
    NotificationType.PLAN_REJECTED,
]

ALERT_TYPES = [
    NotificationType.COMPLIANCE_EXPIRY,
    NotificationType.SESSION_REMINDER,
    NotificationType.COMPLIANCE_ALERT,
]
