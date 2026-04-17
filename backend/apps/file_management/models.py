import uuid
import os
from django.db import models
from django.conf import settings
from .constants import FileType, FileUploadStatus


def generate_file_path(instance, filename):
    """
    Generates a unique file path for uploaded files.
    Format: uploads/{file_type}/{uuid_hex}_{original_name}
    """
    ext = filename.split('.')[-1]
    name = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join("uploads", instance.file_type.lower(), name)


class FileRegistry(models.Model):
    """
    Central registry for all uploaded files (PDFs, Videos, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=generate_file_path)
    file_type = models.CharField(
        max_length=50,
        choices=FileType.choices,
        default=FileType.OTHER
    )
    size_bytes = models.PositiveBigIntegerField(default=0)
    upload_status = models.CharField(
        max_length=50,
        choices=FileUploadStatus.choices,
        default=FileUploadStatus.PENDING
    )
    # Allows tracking who uploaded the file. We use employee record for our LMS
    uploaded_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_files"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "file_registry"
        ordering = ["-created_at"]
        verbose_name_plural = "File Registries"

    def __str__(self):
        return f"{self.original_name} ({self.get_file_type_display()})"
