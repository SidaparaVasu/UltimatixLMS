from django.apps import AppConfig


class SkillManagementConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.skill_management"
    verbose_name = "Skill & Competency Management"

    def ready(self):
        import apps.skill_management.signals
