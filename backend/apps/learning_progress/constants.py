from django.db import models


class ProgressStatus(models.TextChoices):
    NOT_STARTED = "NOT_STARTED", "Not Started"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    DROPPED = "DROPPED", "Dropped"
    OVERDUE = "OVERDUE", "Overdue"


class EnrollmentType(models.TextChoices):
    SELF_ENROLL = "SELF_ENROLL", "Self Enrolled"
    MANDATORY = "MANDATORY", "Mandatory Assignment"
    RECOMMENDED = "RECOMMENDED", "Recommended by Manager"
    TNI_ASSIGNED = "TNI_ASSIGNED", "TNI Gap Closure"
