from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import EmployeeSkill, EmployeeSkillHistory


@receiver(pre_save, sender=EmployeeSkill)
def capture_previous_skill_level(sender, instance, **kwargs):
    """
    Catch the old proficiency level before the record is updated in the database.
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
    Automatically log history when an employee's proficiency level changes.
    """
    old_level = getattr(instance, "_old_level", None)
    new_level = instance.current_level

    # Only log if it's new OR the level actually changed
    if created or (old_level != new_level):
        EmployeeSkillHistory.objects.create(
            employee=instance.employee,
            skill=instance.skill,
            old_level=old_level,
            new_level=new_level,
            remarks="Automated proficiency update." if not created else "Initial skill assignment."
        )
