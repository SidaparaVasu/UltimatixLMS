"""
file_management app signals.

Handles automatic cleanup of extracted SCORM files when a FileRegistry
record is deleted (e.g. when an admin removes a SCORM package from the system).

This keeps extracted files on disk / S3 in sync with the DB.
Without this, deleted packages leave behind orphaned directories.
"""

import logging
from django.db.models.signals import post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_delete, sender='file_management.FileRegistry')
def cleanup_scorm_files_on_delete(sender, instance, **kwargs):
    """
    Deletes extracted SCORM files when the FileRegistry record is removed.
    Only fires for SCORM file types — safe no-op for PDFs, videos, etc.
    """
    from .constants import FileType
    from .scorm_storage import delete_scorm_extracted_files

    if instance.file_type != FileType.SCORM:
        return

    try:
        # ScormPackage may have already been CASCADE-deleted before this signal fires.
        # Grab extracted_path before it's gone by reading the related record.
        package = instance.scorm_package   # will raise RelatedObjectDoesNotExist if gone
        if package.extracted_path:
            delete_scorm_extracted_files(package.extracted_path)
    except Exception:
        # The ScormPackage was already deleted (CASCADE) before we could read it.
        # Nothing we can do — log and move on.
        logger.debug(
            "SCORM cleanup signal: ScormPackage for FileRegistry %s already deleted.",
            instance.pk
        )
