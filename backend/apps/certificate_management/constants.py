from django.db import models


class CertificateType(models.TextChoices):
    COURSE     = 'course',     'Course'
    ASSESSMENT = 'assessment', 'Assessment'


class CertificateStatus(models.TextChoices):
    ACTIVE  = 'active',  'Active'
    EXPIRED = 'expired', 'Expired'
