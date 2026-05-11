from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import (
    EmployeeSkill,
    EmployeeSkillHistory,
    EmployeeSkillRating,
    EmployeeSkillRatingHistory,
)


# ---------------------------------------------------------------------------
# EmployeeSkill — finalized level history
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=EmployeeSkill)
def capture_previous_skill_level(sender, instance, **kwargs):
    """
    Capture the old proficiency level before the record is updated.
    """
    if instance.id:
        try:
            old_instance = EmployeeSkill.objects.get(id=instance.id)
            instance._old_level = old_instance.current_level
        except EmployeeSkill.DoesNotExist:
            instance._old_level = None
    else:
        instance._old_level = None


@receiver(post_save, sender=EmployeeSkill)
def log_skill_change_history(sender, instance, created, **kwargs):
    """
    Log a history entry whenever an employee's finalized proficiency level changes.

    Callers can attach context before saving the EmployeeSkill instance:
        instance._changed_by    = EmployeeMaster | None  (None = system/auto)
        instance._change_reason = EmployeeSkillHistory.ChangeReason value
    If not set, defaults to changed_by=None, change_reason=ADMIN_OVERRIDE.
    """
    old_level = getattr(instance, "_old_level", None)
    new_level = instance.current_level

    if created or (old_level != new_level):
        changed_by    = getattr(instance, "_changed_by",    None)
        change_reason = getattr(instance, "_change_reason", EmployeeSkillHistory.ChangeReason.ADMIN_OVERRIDE)

        EmployeeSkillHistory.objects.create(
            employee=instance.employee,
            skill=instance.skill,
            old_level=old_level,
            new_level=new_level,
            changed_by=changed_by,
            change_reason=change_reason,
            remarks=(
                "Initial skill assignment." if created
                else "Proficiency level updated."
            ),
        )


# ---------------------------------------------------------------------------
# EmployeeSkillRating — TNI cycle rating history
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=EmployeeSkillRating)
def capture_previous_skill_rating(sender, instance, **kwargs):
    """
    Capture the old rating state before the row is updated.
    Stores old level, old status, and a notes snapshot on the instance
    so the post_save signal can write a complete history entry.
    """
    if instance.id:
        try:
            old = EmployeeSkillRating.objects.get(id=instance.id)
            instance._old_rated_level = old.rated_level
            instance._old_status = old.status
            # Snapshot whichever notes field is relevant for this rating type
            instance._old_notes_snapshot = (
                old.observations if old.rating_type == "SELF" else old.notes
            )
        except EmployeeSkillRating.DoesNotExist:
            instance._old_rated_level = None
            instance._old_status = ""
            instance._old_notes_snapshot = ""
    else:
        instance._old_rated_level = None
        instance._old_status = ""
        instance._old_notes_snapshot = ""


@receiver(post_save, sender=EmployeeSkillRating)
def log_skill_rating_history(sender, instance, created, **kwargs):
    """
    Append a history entry every time an EmployeeSkillRating row is
    created or updated — level change, status change, or notes update.

    This is the mechanism that preserves cross-cycle history:
    when a new TNI cycle resets the row, the old state is archived here
    before the update lands.
    """
    old_level = getattr(instance, "_old_rated_level", None)
    old_status = getattr(instance, "_old_status", "")
    old_notes_snapshot = getattr(instance, "_old_notes_snapshot", "")

    new_level = instance.rated_level
    new_status = instance.status
    new_notes_snapshot = (
        instance.observations if instance.rating_type == "SELF" else instance.notes
    )

    # Always write on creation; on update only write if something meaningful changed
    something_changed = (
        old_level != new_level
        or old_status != new_status
        or old_notes_snapshot != new_notes_snapshot
    )

    if created or something_changed:
        EmployeeSkillRatingHistory.objects.create(
            employee=instance.employee,
            skill=instance.skill,
            rating_type=instance.rating_type,
            rated_by=instance.rated_by,
            old_level=old_level,
            new_level=new_level,
            old_status=old_status,
            new_status=new_status,
            notes_snapshot=new_notes_snapshot,
        )
