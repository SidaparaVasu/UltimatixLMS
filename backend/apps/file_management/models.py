import uuid
import os
from django.db import models
from django.conf import settings
from .constants import FileType, FileUploadStatus


def generate_file_path(instance, filename):
    """
    Generates a unique file path for uploaded files.
    Format: uploads/{file_type_lower}/{uuid_hex}.{ext}
    """
    ext = filename.split('.')[-1]
    name = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join("uploads", instance.file_type.lower(), name)


class FileRegistry(models.Model):
    """
    Central registry for all uploaded files (PDFs, Videos, PPTs, etc.)

    PPT/PPTX files are converted to PDF at upload time.
    The resulting PDF is stored as a separate FileRegistry record and linked
    via `converted_from` on the PDF record (pointing back to the original PPT).
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

    # When a PPT is converted to PDF, the resulting PDF record points back here.
    # Conversely, the PPT record's `converted_pdf` reverse relation gives the PDF.
    converted_from = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_pdf',
        help_text="For PDF records that were converted from a PPT/PPTX, this points to the original."
    )

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

    @property
    def effective_pdf(self):
        """
        Returns the PDF version of this file.
        - If this record IS a PDF, returns self.
        - If this is a PPT with a converted PDF, returns the converted PDF record.
        - Otherwise returns None.
        """
        if self.file_type == FileType.PDF:
            return self
        # PPT/PPTX — check for converted PDF
        try:
            return self.converted_pdf  # reverse OneToOne from converted_from
        except FileRegistry.DoesNotExist:
            return None


class ScormPackage(models.Model):
    """
    Metadata extracted from imsmanifest.xml at upload time.
    Created by FileService when a ZIP with file_type=SCORM is uploaded.
    One record per uploaded SCORM ZIP.
    """
    file_ref = models.OneToOneField(
        FileRegistry,
        on_delete=models.CASCADE,
        related_name='scorm_package',
    )
    # '1.2', '2004_2nd', '2004_3rd', '2004_4th'
    scorm_version = models.CharField(max_length=20, default='1.2')

    # Relative path inside the extracted package to the launch HTML file
    # e.g. 'index.html' or 'story.html' or 'scormcontent/index.html'
    launch_url = models.CharField(max_length=500)

    # Course title from manifest <title> element
    title = models.CharField(max_length=255, blank=True, default='')

    # Where the extracted files live:
    # - Dev:  absolute disk path  e.g. /app/media/scorm/<uuid>/
    # - Prod: S3 prefix           e.g. scorm/<uuid>
    extracted_path = models.CharField(max_length=500, blank=True, default='')

    extracted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'scorm_package'
        verbose_name = 'SCORM Package'
        verbose_name_plural = 'SCORM Packages'

    def __str__(self):
        return f"{self.title or self.file_ref.original_name} (v{self.scorm_version})"

