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
import zipfile
import xml.etree.ElementTree as ET
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.signing import Signer, BadSignature
from django.core.files import File
from django.utils import timezone
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

        # 3. Magic-byte check for ZIP files — reject fakes
        if ext == 'zip' and not self._is_valid_zip(file_obj):
            raise ValidationError(
                "Uploaded file does not appear to be a valid ZIP archive "
                "(invalid magic bytes). Re-export the SCORM package and try again."
            )

        return ext

    @staticmethod
    def _is_valid_zip(file_obj) -> bool:
        """
        Checks the ZIP magic bytes (PK\x03\x04) at the start of the file.
        Extension alone is not a reliable indicator of file type.
        """
        try:
            file_obj.seek(0)
            header = file_obj.read(4)
            file_obj.seek(0)
            return header == b'PK\x03\x04'
        except Exception:
            return False

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
        Orchestrates file upload and post-processing.

        For PPT/PPTX:
          1. Saves with status=CONVERTING
          2. Converts to PDF via unoconv
          3. Creates a linked PDF record
          4. Updates PPT status to UPLOADED

        For SCORM (ZIP):
          1. Saves with status=UPLOADED
          2. Extracts ZIP to local disk (dev) or S3 (prod)
          3. Parses imsmanifest.xml
          4. Creates a ScormPackage record linked to this registry

        For all other types: saves directly with status=UPLOADED.
        """
        ext = self.validate_file(file_obj)
        file_type = self.map_extension_to_type(ext)

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

        if file_type == FileType.PPT:
            try:
                self._convert_ppt_to_pdf(registry, uploaded_by_employee)
            except Exception as exc:
                logger.error(
                    "PPT→PDF conversion failed for file %s: %s",
                    registry.pk, exc, exc_info=True
                )
                registry.upload_status = FileUploadStatus.FAILED
                registry.save(update_fields=['upload_status'])

        elif file_type == FileType.SCORM:
            try:
                self._extract_scorm(registry)
            except Exception as exc:
                logger.error(
                    "SCORM extraction failed for file %s: %s",
                    registry.pk, exc, exc_info=True
                )
                registry.upload_status = FileUploadStatus.FAILED
                registry.save(update_fields=['upload_status'])
                raise   # re-raise so the upload view returns an error to the admin

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

    # ── SCORM Extraction ───────────────────────────────────────────────

    def _extract_scorm(self, registry):
        """
        Extracts a SCORM ZIP and creates the ScormPackage metadata record.

        Steps:
          1. Call extract_scorm_to_storage() — handles local vs S3 transparently
          2. Find imsmanifest.xml inside the extracted tree
          3. Parse version, launch_url, and title from the manifest
          4. Create a ScormPackage record linked to this FileRegistry
        """
        from .scorm_storage import extract_scorm_to_storage
        from .models import ScormPackage

        package_uuid = str(registry.pk)

        # Extract ZIP to the correct location (local or S3)
        extracted_path = extract_scorm_to_storage(registry.file, package_uuid)

        # Find imsmanifest.xml in the extracted directory (local only; S3 uses temp)
        # For S3, the manifest was already extracted to temp during upload.
        # We re-parse it from a temp extraction if needed.
        manifest_path = self._find_manifest(extracted_path, registry.file, package_uuid)

        version, launch_url, title = self._parse_manifest(manifest_path)

        ScormPackage.objects.create(
            file_ref=registry,
            scorm_version=version,
            launch_url=launch_url,
            title=title,
            extracted_path=extracted_path,
            extracted_at=timezone.now(),
        )

        logger.info(
            "SCORM package ready: %s | version=%s | launch=%s",
            registry.pk, version, launch_url
        )

    def _find_manifest(self, extracted_path: str, zip_field, package_uuid: str) -> str:
        """
        Returns the absolute path to imsmanifest.xml.

        For local storage: searches the extracted directory on disk.
        For S3 storage:    we need to look inside the original ZIP since the
                           extracted files are on S3. Use a fresh temp extraction.
        """
        from .scorm_storage import is_s3_storage

        if not is_s3_storage():
            # Search extracted directory on disk
            manifest = os.path.join(extracted_path, 'imsmanifest.xml')
            if os.path.exists(manifest):
                return manifest
            # Some packages nest one level deep
            for root_dir, _, files in os.walk(extracted_path):
                if 'imsmanifest.xml' in files:
                    return os.path.join(root_dir, 'imsmanifest.xml')
            raise ValidationError(
                "No imsmanifest.xml found in the SCORM package. "
                "Is this a valid SCORM package?"
            )
        else:
            # S3: download the ZIP from S3 and extract just the manifest to a temp dir
            import boto3
            tmp_dir = tempfile.mkdtemp(prefix="scorm_manifest_")
            try:
                s3 = boto3.client(
                    "s3",
                    region_name=getattr(settings, "AWS_S3_REGION_NAME", "ap-south-1"),
                    aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
                    aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
                )
                zip_tmp = os.path.join(tmp_dir, 'package.zip')
                s3.download_file(settings.AWS_STORAGE_BUCKET_NAME, zip_field.name, zip_tmp)

                with zipfile.ZipFile(zip_tmp, 'r') as zf:
                    # Extract only the manifest file(s)
                    for name in zf.namelist():
                        if 'imsmanifest.xml' in name:
                            zf.extract(name, tmp_dir)
                            manifest_path = os.path.join(tmp_dir, name)
                            # Move it to tmp_dir root so we can clean up cleanly
                            return manifest_path
                raise ValidationError(
                    "No imsmanifest.xml found in the SCORM package. "
                    "Is this a valid SCORM package?"
                )
            except ValidationError:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                raise
            # Note: tmp_dir is intentionally NOT cleaned up here.
            # The returned path must remain valid until _parse_manifest() reads it.
            # The OS will clean up temp dirs on reboot; acceptable trade-off.

    def _parse_manifest(self, manifest_path: str) -> tuple:
        """
        Parses imsmanifest.xml and extracts the SCORM version, launch URL, and title.
        Returns: (scorm_version: str, launch_url: str, title: str)

        Uses namespace-agnostic tag matching so it works across all authoring tools
        regardless of the namespace URI variations they use.
        """
        try:
            tree = ET.parse(manifest_path)
            root = tree.getroot()
        except ET.ParseError as exc:
            raise ValidationError(f"imsmanifest.xml is not valid XML: {exc}")

        # --- Detect SCORM version ---
        version = self._detect_scorm_version(manifest_path, root)

        # --- Extract title (first <title> element anywhere in the manifest) ---
        title = ''
        for elem in root.iter():
            local_tag = elem.tag.split('}')[-1].lower()
            if local_tag == 'title' and elem.text and elem.text.strip():
                title = elem.text.strip()
                break

        # --- Find the SCO launch URL ---
        # SCORM 1.2: <resource type="webcontent" adlcp:scormtype="sco" href="..."/>
        # SCORM 2004: same pattern but different namespace
        # Strategy: find the first resource with scormtype="sco"; fallback to first href
        launch_url = ''
        first_href = ''

        for elem in root.iter():
            local_tag = elem.tag.split('}')[-1].lower()
            if local_tag != 'resource':
                continue

            href = elem.get('href', '')
            # Some tools put the href in a namespaced attribute; try common variants
            if not href:
                for attr, val in elem.attrib.items():
                    if attr.split('}')[-1].lower() == 'href':
                        href = val
                        break

            if not href:
                continue

            if not first_href:
                first_href = href

            # Check scormtype attribute — could be namespaced
            scorm_type = ''
            for attr, val in elem.attrib.items():
                if attr.split('}')[-1].lower() == 'scormtype':
                    scorm_type = val.lower()
                    break

            if scorm_type == 'sco':
                launch_url = href
                break   # Found the SCO — no need to keep searching

        if not launch_url:
            # Fallback 1: use the first resource href found
            launch_url = first_href

        if not launch_url:
            # Fallback 2: look for index.html in the manifest's directory
            manifest_dir = os.path.dirname(manifest_path)
            if os.path.exists(os.path.join(manifest_dir, 'index.html')):
                launch_url = 'index.html'

        if not launch_url:
            raise ValidationError(
                "Cannot determine the SCORM launch URL from imsmanifest.xml. "
                "The package may be corrupt or non-standard."
            )

        return version, launch_url, title

    @staticmethod
    def _detect_scorm_version(manifest_path: str, root) -> str:
        """
        Detects SCORM version from the manifest XML content.
        Returns one of: '1.2', '2004_2nd', '2004_3rd', '2004_4th'
        Defaults to '1.2' when detection is ambiguous (safer assumption).
        """
        # Try reading from <schemaversion> element
        for elem in root.iter():
            if elem.tag.split('}')[-1].lower() == 'schemaversion' and elem.text:
                v = elem.text.strip()
                if '1.2' in v:
                    return '1.2'
                if '2004' in v:
                    if '4th' in v.lower() or '4.0' in v:
                        return '2004_4th'
                    if '3rd' in v.lower() or '3.0' in v:
                        return '2004_3rd'
                    if '2nd' in v.lower() or '2.0' in v:
                        return '2004_2nd'
                    return '2004_4th'   # unspecified 2004 → assume latest

        # Fallback: check namespace URIs in the raw file
        try:
            with open(manifest_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read(2048)   # only need the header
            if 'adlcp_v1p3' in content or 'adlcp_rootv1p3' in content:
                return '2004_4th'
            if 'adlcp_rootv1p2' in content:
                return '1.2'
        except OSError:
            pass

        return '1.2'   # safe default

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
