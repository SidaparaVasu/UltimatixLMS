from django.db import models


class FileType(models.TextChoices):
    PDF = "PDF", "PDF Document"
    PPT = "PPT", "Presentation (PPT/PPTX)"
    VIDEO = "VIDEO", "Video"
    SCORM = "SCORM", "SCORM Package"
    DOCUMENT = "DOCUMENT", "General Document"
    OTHER = "OTHER", "Other"


class FileUploadStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    UPLOADED = "UPLOADED", "Uploaded"
    FAILED = "FAILED", "Failed"
