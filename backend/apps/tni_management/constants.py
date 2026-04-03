"""
TNI Management Constants

"""

from django.db import models

class TNISourceType(models.TextChoices):
    SELF = "SELF", "Self Assessment"
    MANAGER = "MANAGER", "Manager Evaluation"
    SKILL_GAP = "SKILL_GAP", "Skill Gap Detection"
    COMPLIANCE = "COMPLIANCE", "Compliance Requirement"
    SYSTEM = "SYSTEM", "System Generated"


class TNIPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class TNIStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    PLANNED = "PLANNED", "Planned"
    COMPLETED = "COMPLETED", "Completed"


class TNIApprovalStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
