from django.apps import AppConfig


class CertificateManagementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.certificate_management'
    verbose_name = 'Certificate Management'

    def ready(self):
        import apps.certificate_management.signals  # noqa: F401
