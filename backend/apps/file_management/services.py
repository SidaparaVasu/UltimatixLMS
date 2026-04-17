import os
from django.conf import settings
from django.core.exceptions import ValidationError
from common.services.base import BaseService
from .repositories import FileRepository
from .constants import FileType, FileUploadStatus


class FileService(BaseService):
    """
    Business logic for file uploading and processing.
    """
    repository_class = FileRepository

    def validate_file(self, file_obj):
        """
        Validates file size and extension based on system settings.
        """
        # 1. Check Extension
        ext = file_obj.name.split('.')[-1].lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise ValidationError(
                f"File extension '.{ext}' is not allowed. Supported: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
            )

        # 2. Check Size
        size_mb = file_obj.size / (1024 * 1024)
        if size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise ValidationError(
                f"File size {size_mb:.2f}MB exceeds the limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        
        return ext

    def map_extension_to_type(self, ext):
        """
        Maps a file extension to a FileType constant.
        """
        mapping = {
            'pdf': FileType.PDF,
            'ppt': FileType.PPT,
            'pptx': FileType.PPT,
            'mp4': FileType.VIDEO,
            'webm': FileType.VIDEO,
            'mov': FileType.VIDEO,
            'zip': FileType.SCORM,  # Usually SCORM are zip
            'doc': FileType.DOCUMENT,
            'docx': FileType.DOCUMENT,
        }
        return mapping.get(ext, FileType.OTHER)

    def upload_file(self, file_obj, uploaded_by_employee=None):
        """
        Orchestrates the file upload and registry creation.
        """
        ext = self.validate_file(file_obj)
        file_type = self.map_extension_to_type(ext)

        # Create the registry record
        # Note: 'file' field expects the file object, Django's FileField handles the saving
        registry = self.repository.create(**{
            "original_name": file_obj.name,
            "file": file_obj,
            "file_type": file_type,
            "size_bytes": file_obj.size,
            "upload_status": FileUploadStatus.UPLOADED,
            "uploaded_by": uploaded_by_employee
        })
        
        return registry
