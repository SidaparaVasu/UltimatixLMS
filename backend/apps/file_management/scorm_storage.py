"""
Storage-aware SCORM extraction utilities.

Abstracts the difference between local-disk (dev) and S3-based (prod) storage
so the rest of the codebase doesn't need to know which backend is active.

  Dev:  extract ZIP to MEDIA_ROOT/scorm/<uuid>/
  Prod: download ZIP from S3 → extract to temp dir → re-upload each file to S3

The active backend is determined by settings.STORAGE_BACKEND ('local' or 's3').
Switch it via the STORAGE_BACKEND env var — no code changes required.
"""

import os
import zipfile
import tempfile
import shutil
import logging
from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def is_s3_storage() -> bool:
    """Returns True when the active storage backend is S3."""
    return getattr(settings, "STORAGE_BACKEND", "local") == "s3"


def extract_scorm_to_storage(zip_field, package_uuid: str) -> str:
    """
    Extracts a SCORM ZIP file to the correct storage location for the active backend.

    Args:
        zip_field: The Django FileField instance pointing to the uploaded ZIP.
        package_uuid: UUID string (as str) used as the directory name for extracted files.

    Returns:
        The 'extracted_path' value to store on ScormPackage:
        - Local: absolute disk path  e.g. /app/media/scorm/abc123/
        - S3:    S3 key prefix       e.g. scorm/abc123

    Raises:
        ValidationError: on zip slip, missing manifest, zip bomb, or extraction failure.
    """
    if is_s3_storage():
        return _extract_to_s3(zip_field, package_uuid)
    return _extract_to_local(zip_field, package_uuid)


def get_scorm_launch_url(extracted_path: str, launch_url: str) -> str:
    """
    Returns the browser-loadable URL for the SCORM launch file.

    - Local dev:  /scorm-content/<uuid>/index.html
                  (Django's dev server or Nginx alias at SCORM_SERVE_PATH)
    - S3 prod:    https://<cloudfront-domain>/scorm/<uuid>/index.html
                  (CloudFront serving from S3 bucket)

    extracted_path is whatever was stored in ScormPackage.extracted_path.
    """
    serve_path = getattr(settings, "SCORM_SERVE_PATH", "scorm-content")

    if is_s3_storage():
        domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "")
        if not domain:
            raise RuntimeError(
                "AWS_S3_CUSTOM_DOMAIN is not configured. "
                "Set it to your CloudFront distribution domain in the env vars."
            )
        # extracted_path is the S3 prefix e.g. 'scorm/abc123'
        return f"https://{domain}/{extracted_path}/{launch_url}"

    # Local: extracted_path is an absolute disk path like /app/media/scorm/<uuid>/
    # We derive the UUID from the last path component.
    uuid_part = os.path.basename(extracted_path.rstrip(os.sep))
    return f"/{serve_path}/{uuid_part}/{launch_url}"


def delete_scorm_extracted_files(extracted_path: str):
    """
    Deletes all extracted SCORM files when a package is removed.
    Called from the post_delete signal on FileRegistry.
    """
    if not extracted_path:
        return

    if is_s3_storage():
        _delete_from_s3(extracted_path)
    else:
        if os.path.isdir(extracted_path):
            shutil.rmtree(extracted_path, ignore_errors=True)
            logger.info("Deleted local SCORM extraction dir: %s", extracted_path)


# ---------------------------------------------------------------------------
# Internal — Local extraction
# ---------------------------------------------------------------------------

def _extract_to_local(zip_field, package_uuid: str) -> str:
    """
    Extracts the ZIP to MEDIA_ROOT/scorm/<uuid>/ on disk.
    Used during development (STORAGE_BACKEND=local).
    """
    zip_abs_path = zip_field.path   # FileSystemStorage provides .path

    if not zipfile.is_zipfile(zip_abs_path):
        raise ValidationError("Uploaded file is not a valid ZIP archive.")

    prefix = getattr(settings, "SCORM_STORAGE_PREFIX", "scorm")
    target_dir = os.path.join(settings.MEDIA_ROOT, prefix, package_uuid)
    os.makedirs(target_dir, exist_ok=True)

    _safe_extract(zip_abs_path, target_dir)
    logger.info("SCORM extracted locally to: %s", target_dir)
    return target_dir


# ---------------------------------------------------------------------------
# Internal — S3 extraction
# ---------------------------------------------------------------------------

def _extract_to_s3(zip_field, package_uuid: str) -> str:
    """
    Downloads the ZIP from S3, extracts it to a local temp dir,
    then re-uploads each extracted file back to S3.

    S3 key structure after extraction:
        scorm/<package_uuid>/index.html
        scorm/<package_uuid>/story_content/frame.js
        ...

    Returns the S3 key prefix (stored in ScormPackage.extracted_path).
    """
    import boto3

    s3_key = zip_field.name       # e.g. uploads/scorm/abc123.zip
    bucket  = settings.AWS_STORAGE_BUCKET_NAME
    prefix  = f"{getattr(settings, 'SCORM_STORAGE_PREFIX', 'scorm')}/{package_uuid}"

    tmp_dir = tempfile.mkdtemp(prefix="scorm_extract_")
    try:
        s3 = _s3_client()

        # 1. Download ZIP from S3
        zip_tmp_path = os.path.join(tmp_dir, "package.zip")
        logger.info("Downloading SCORM ZIP from S3: s3://%s/%s", bucket, s3_key)
        s3.download_file(bucket, s3_key, zip_tmp_path)

        if not zipfile.is_zipfile(zip_tmp_path):
            raise ValidationError("Downloaded file from S3 is not a valid ZIP archive.")

        # 2. Extract to local temp dir (with security checks)
        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        _safe_extract(zip_tmp_path, extract_dir)

        # 3. Upload each extracted file to S3
        logger.info("Uploading extracted SCORM files to s3://%s/%s/", bucket, prefix)
        file_count = 0
        for root_dir, _, files in os.walk(extract_dir):
            for filename in files:
                local_path = os.path.join(root_dir, filename)
                relative   = os.path.relpath(local_path, extract_dir)
                s3_key_out = f"{prefix}/{relative.replace(os.sep, '/')}"

                extra = _s3_extra_args(filename)
                s3.upload_file(local_path, bucket, s3_key_out, ExtraArgs=extra)
                file_count += 1

        logger.info("SCORM upload to S3 complete — %d files under s3://%s/%s/", file_count, bucket, prefix)
        return prefix

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _s3_client():
    """Creates a boto3 S3 client using credentials from settings."""
    import boto3
    return boto3.client(
        "s3",
        region_name=getattr(settings, "AWS_S3_REGION_NAME", "ap-south-1"),
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
    )


def _s3_extra_args(filename: str) -> dict:
    """
    Determines S3 upload ExtraArgs based on file type.
    - HTML/XML: no-cache (manifest or entry page may change on re-upload)
    - Everything else: cache for 1 day
    """
    import mimetypes
    content_type, _ = mimetypes.guess_type(filename)
    extra: dict = {}
    if content_type:
        extra["ContentType"] = content_type

    if filename.lower().endswith(('.html', '.htm', '.xml')):
        extra["CacheControl"] = "no-cache"
    else:
        extra["CacheControl"] = "max-age=86400"

    return extra


def _delete_from_s3(prefix: str):
    """Deletes all S3 objects under the given prefix (the package's extracted tree)."""
    import boto3
    s3      = _s3_client()
    bucket  = settings.AWS_STORAGE_BUCKET_NAME
    paginator = s3.get_paginator("list_objects_v2")
    pages   = paginator.paginate(Bucket=bucket, Prefix=prefix.rstrip("/") + "/")

    keys = [
        {"Key": obj["Key"]}
        for page in pages
        for obj in page.get("Contents", [])
    ]
    if keys:
        s3.delete_objects(Bucket=bucket, Delete={"Objects": keys})
        logger.info("Deleted %d S3 objects under prefix: %s", len(keys), prefix)


# ---------------------------------------------------------------------------
# Shared — ZIP extraction with security checks
# ---------------------------------------------------------------------------

def _safe_extract(zip_path: str, target_dir: str):
    """
    Extracts a ZIP file with:
      - Zip slip protection (directory traversal)
      - Zip bomb detection (file count + uncompressed size)
      - Null byte / backslash filename rejection

    Raises ValidationError on any security violation.
    """
    max_files = getattr(settings, "SCORM_MAX_FILES_IN_PACKAGE", 2000)
    max_bytes = getattr(settings, "SCORM_MAX_UNZIPPED_SIZE_MB", 500) * 1024 * 1024

    real_target = os.path.realpath(target_dir)

    with zipfile.ZipFile(zip_path, "r") as zf:
        members = zf.infolist()

        # Zip bomb: check declared file count before opening anything
        if len(members) > max_files:
            raise ValidationError(
                f"SCORM package contains {len(members)} files which exceeds the "
                f"maximum of {max_files}. Please split or re-export the package."
            )

        # Zip bomb: check total uncompressed size from ZIP headers
        total_uncompressed = sum(m.file_size for m in members)
        if total_uncompressed > max_bytes:
            raise ValidationError(
                f"SCORM package uncompressed size "
                f"({total_uncompressed // (1024 * 1024)}MB) exceeds the "
                f"{max_bytes // (1024 * 1024)}MB limit."
            )

        # Validate all paths before extracting a single byte
        for member in members:
            name = member.filename

            # Null bytes in filename
            if "\x00" in name:
                raise ValidationError(
                    f"Security: ZIP contains a filename with null bytes. Upload rejected."
                )

            # Zip slip: resolve the full target path and ensure it stays inside target_dir
            member_path = os.path.realpath(os.path.join(real_target, name))
            if not member_path.startswith(real_target + os.sep) and member_path != real_target:
                raise ValidationError(
                    f"Security: ZIP contains an illegal path '{name}'. "
                    f"Upload rejected (zip slip attempt)."
                )

        # All checks passed — extract
        for member in members:
            member_path = os.path.join(real_target, member.filename)
            if member.filename.endswith("/"):
                os.makedirs(member_path, exist_ok=True)
                continue
            os.makedirs(os.path.dirname(member_path), exist_ok=True)
            with zf.open(member) as src, open(member_path, "wb") as dst:
                dst.write(src.read())
