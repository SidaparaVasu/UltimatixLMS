"""
FileService handles:
  - File validation and upload
  - PPT → PDF conversion at upload time (using unoconv)
  - Signed token generation and validation for secure file serving
"""

import os
import logging
import subprocess
import tempfile
import shutil
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.signing import Signer, BadSignature
from django.core.files import File
from common.services.base import BaseService
from .repositories import FileRepository
from .constants import FileType, FileUploadStatus

logger = logging.getLogger(__name__)


class FileService(BaseService):
    """
    Business logic for file uploading and processing.
    """
    repository_class = FileRepository

    # ── Validation ────────────────────────────────────────────────────────────

    def validate_file(self, file_obj):
        """
        Validates file extension and size.
        Uses per-type size limits from MAX_UPLOAD_SIZE_BY_TYPE_MB when available,
        falling back to the global MAX_UPLOAD_SIZE_MB.
        Returns the lowercase extension on success.
        """
        ext = file_obj.name.split('.')[-1].lower()

        # 1. Extension check
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise ValidationError(
                f"File extension '.{ext}' is not allowed. "
                f"Supported: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}"
            )

        # 2. Per-type size limit (falls back to global limit)
        per_type_limits = getattr(settings, 'MAX_UPLOAD_SIZE_BY_TYPE_MB', {})
        max_mb = per_type_limits.get(ext, settings.MAX_UPLOAD_SIZE_MB)

        size_mb = file_obj.size / (1024 * 1024)
        if size_mb > max_mb:
            raise ValidationError(
                f"File size {size_mb:.1f}MB exceeds the {max_mb}MB limit for .{ext} files."
            )

        return ext

    def map_extension_to_type(self, ext):
        """Maps a file extension to a FileType constant."""
        mapping = {
            'pdf':  FileType.PDF,
            'ppt':  FileType.PPT,
            'pptx': FileType.PPT,
            'mp4':  FileType.VIDEO,
            'webm': FileType.VIDEO,
            'mov':  FileType.VIDEO,
            'zip':  FileType.SCORM,
            'doc':  FileType.DOCUMENT,
            'docx': FileType.DOCUMENT,
        }
        return mapping.get(ext, FileType.OTHER)

    # ── Upload ────────────────────────────────────────────────────────────────

    def upload_file(self, file_obj, uploaded_by_employee=None):
        """
        Orchestrates file upload and registry creation.

        For PPT/PPTX files:
          1. Saves the original PPT record with status=CONVERTING
          2. Converts to PDF using unoconv (synchronous, at upload time)
          3. Saves the resulting PDF as a new FileRegistry record
          4. Links the PDF back to the PPT via converted_from
          5. Updates the PPT record status to UPLOADED

        For all other types: saves directly with status=UPLOADED.
        """
        ext = self.validate_file(file_obj)
        file_type = self.map_extension_to_type(ext)

        # Save the original file record
        registry = self.repository.create(**{
            "original_name": file_obj.name,
            "file": file_obj,
            "file_type": file_type,
            "size_bytes": file_obj.size,
            "upload_status": (
                FileUploadStatus.CONVERTING
                if file_type == FileType.PPT
                else FileUploadStatus.UPLOADED
            ),
            "uploaded_by": uploaded_by_employee,
        })

        # Trigger PPT → PDF conversion
        if file_type == FileType.PPT:
            try:
                self._convert_ppt_to_pdf(registry, uploaded_by_employee)
            except Exception as exc:
                # Conversion failed — mark original as FAILED but don't block upload
                logger.error(
                    "PPT→PDF conversion failed for file %s: %s",
                    registry.pk, exc, exc_info=True
                )
                registry.upload_status = FileUploadStatus.FAILED
                registry.save(update_fields=['upload_status'])

        return registry

    # ── PPT → PDF Conversion ──────────────────────────────────────────────────

    def _convert_ppt_to_pdf(self, ppt_registry, uploaded_by_employee=None):
        """
        Converts a PPT/PPTX file to PDF using unoconv.

        Steps:
          1. Resolve the absolute path of the saved PPT file
          2. Run: unoconv -f pdf -o <output_dir> <input_file>
          3. Save the resulting PDF as a new FileRegistry record
          4. Link the PDF record back to the PPT via converted_from
          5. Mark the PPT record as UPLOADED

        Raises RuntimeError if unoconv is not available or conversion fails.
        """
        ppt_abs_path = os.path.join(settings.MEDIA_ROOT, str(ppt_registry.file))

        if not os.path.exists(ppt_abs_path):
            raise FileNotFoundError(f"PPT file not found at: {ppt_abs_path}")

        # Use a temp directory for the conversion output
        tmp_dir = tempfile.mkdtemp(prefix='ppt_convert_')
        try:
            # ── Run unoconv ──────────────────────────────────────────────────
            result = subprocess.run(
                ['unoconv', '-f', 'pdf', '-o', tmp_dir, ppt_abs_path],
                capture_output=True,
                text=True,
                timeout=getattr(settings, 'UNOCONV_TIMEOUT_SECONDS', 120),
            )

            if result.returncode != 0:
                raise RuntimeError(
                    f"unoconv failed (exit {result.returncode}): {result.stderr.strip()}"
                )

            # ── Find the output PDF ──────────────────────────────────────────
            base_name = os.path.splitext(os.path.basename(ppt_abs_path))[0]
            pdf_tmp_path = os.path.join(tmp_dir, f"{base_name}.pdf")

            if not os.path.exists(pdf_tmp_path):
                # unoconv sometimes uses the original filename
                candidates = [f for f in os.listdir(tmp_dir) if f.endswith('.pdf')]
                if not candidates:
                    raise FileNotFoundError("unoconv did not produce a PDF output file.")
                pdf_tmp_path = os.path.join(tmp_dir, candidates[0])

            # ── Save PDF as a new FileRegistry record ────────────────────────
            pdf_original_name = (
                os.path.splitext(ppt_registry.original_name)[0] + '.pdf'
            )
            pdf_size = os.path.getsize(pdf_tmp_path)

            with open(pdf_tmp_path, 'rb') as pdf_file:
                django_file = File(pdf_file, name=pdf_original_name)
                pdf_registry = self.repository.create(**{
                    "original_name": pdf_original_name,
                    "file": django_file,
                    "file_type": FileType.PDF,
                    "size_bytes": pdf_size,
                    "upload_status": FileUploadStatus.UPLOADED,
                    "uploaded_by": uploaded_by_employee,
                    "converted_from": ppt_registry,
                })

            logger.info(
                "PPT→PDF conversion successful: %s → %s",
                ppt_registry.pk, pdf_registry.pk
            )

            # ── Mark original PPT as UPLOADED ────────────────────────────────
            ppt_registry.upload_status = FileUploadStatus.UPLOADED
            ppt_registry.save(update_fields=['upload_status'])

            return pdf_registry

        finally:
            # Always clean up the temp directory
            shutil.rmtree(tmp_dir, ignore_errors=True)

    @staticmethod
    def is_unoconv_available():
        """
        Checks whether unoconv is installed on the system.
        Used for health checks and graceful degradation in dev.
        """
        return shutil.which('unoconv') is not None

    # ── Token Generation / Validation ─────────────────────────────────────────

    def generate_serve_token(self, file_id, user_id):
        """
        Generates a short-lived signed token for secure file access.
        Payload: "<file_id>:<user_id>" signed with Django's Signer (HMAC).
        """
        signer = Signer(salt='doc-serve')
        payload = f"{file_id}:{user_id}"
        return signer.sign(payload)

    def validate_serve_token(self, token, user_id):
        """
        Validates a serve token and returns the file_id if valid.
        Raises BadSignature if the token is invalid or user_id doesn't match.
        """
        signer = Signer(salt='doc-serve')
        try:
            payload = signer.unsign(token)
            file_id_str, token_user_id_str = payload.split(':')
            if int(token_user_id_str) != user_id:
                raise BadSignature("User ID mismatch")
            return file_id_str
        except (BadSignature, ValueError) as exc:
            raise BadSignature(f"Invalid token: {exc}") from exc
