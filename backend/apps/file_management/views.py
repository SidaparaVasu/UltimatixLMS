"""
Secure File Serve:
  POST /api/v1/files/files/request-token/   → returns a short-lived signed token
  GET  /api/v1/files/resources/<token>/     → streams the file with security headers

Files are NEVER served via /media/ directly to learners.
The real storage path is hidden behind the token.
"""

import os
import hashlib
import mimetypes
from email.utils import formatdate
from django.core.exceptions import ValidationError
from django.core.signing import BadSignature
from django.http import StreamingHttpResponse, Http404
from django.conf import settings
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.response import success_response, error_response, created_response
from .models import FileRegistry
from .serializers import FileRegistrySerializer
from .services import FileService

# ── Constants ─────────────────────────────────────────────────────────────────

STREAM_CHUNK_SIZE = 512 * 1024  # 512 KB per chunk


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_range_header(range_header, file_size):
    """
    Parses the HTTP Range header.
    Returns (start, end) byte positions (inclusive).
    Returns (0, file_size - 1) if no valid range.
    """
    if not range_header or not range_header.startswith('bytes='):
        return 0, file_size - 1
    try:
        range_spec = range_header[6:]
        start_str, end_str = range_spec.split('-')
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        start = max(0, min(start, file_size - 1))
        end = max(start, min(end, file_size - 1))
        return start, end
    except (ValueError, AttributeError):
        return 0, file_size - 1


def _file_iterator(file_path, start, end, chunk_size=STREAM_CHUNK_SIZE):
    """Generator that yields file chunks between byte positions start and end."""
    with open(file_path, 'rb') as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            read_size = min(chunk_size, remaining)
            data = f.read(read_size)
            if not data:
                break
            yield data
            remaining -= len(data)


def _compute_etag(file_path, file_size, mtime):
    """
    Computes a stable ETag from file path + mtime + size.
    Cheap to compute — no file content read needed.
    """
    raw = f"{file_path}:{mtime}:{file_size}"
    return hashlib.md5(raw.encode(), usedforsecurity=False).hexdigest()


def _build_secure_response(file_path, mime_type, range_header=None):
    """
    Builds a StreamingHttpResponse with security + caching headers.

    Security headers:
      - Cache-Control: no-store (browser must not cache)
      - X-Frame-Options: SAMEORIGIN
      - X-Content-Type-Options: nosniff
      - Referrer-Policy: no-referrer

    CDN/proxy caching headers:
      - ETag: stable hash of path+mtime+size
      - Last-Modified: file mtime in HTTP date format
      These allow a CDN to cache the file while the browser itself does not.

    Range request headers:
      - Accept-Ranges: bytes
      - Content-Range: bytes start-end/total
    """
    stat = os.stat(file_path)
    file_size = stat.st_size
    mtime = stat.st_mtime

    start, end = _parse_range_header(range_header, file_size)
    is_partial = (start != 0 or end != file_size - 1)

    response = StreamingHttpResponse(
        _file_iterator(file_path, start, end),
        content_type=mime_type,
        status=206 if is_partial else 200,
    )

    # ── Content headers ──────────────────────────────────────────────────────
    response['Content-Length'] = str(end - start + 1)
    response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
    response['Accept-Ranges'] = 'bytes'
    response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'

    # ── CDN/proxy caching headers ──────────────────────────────────
    # ETag lets a CDN revalidate without re-downloading the full file
    response['ETag'] = f'"{_compute_etag(file_path, file_size, mtime)}"'
    # Last-Modified in RFC 7231 format
    response['Last-Modified'] = formatdate(mtime, usegmt=True)

    # ── Security headers ──────────────────────────────────────────────────────
    # Browser must NOT cache — token is single-use per session
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
    response['Pragma'] = 'no-cache'
    # Allow iframe embedding from same origin only
    response['X-Frame-Options'] = 'SAMEORIGIN'
    # Prevent MIME sniffing
    response['X-Content-Type-Options'] = 'nosniff'
    # Prevent referrer leaking the token URL
    response['Referrer-Policy'] = 'no-referrer'

    return response


# ── Views ─────────────────────────────────────────────────────────────────────

class FileViewSet(viewsets.ModelViewSet):
    """API for managing uploaded files."""
    queryset = FileRegistry.objects.all()
    serializer_class = FileRegistrySerializer
    service_class = FileService()
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        if hasattr(user, 'employee_record'):
            employee = user.employee_record.first()
            if employee:
                return self.queryset.filter(uploaded_by=employee)
        return self.queryset.none()

    @action(detail=False, methods=['get'], url_path='conversion-health')
    def conversion_health(self, request):
        """
        Health check: reports whether unoconv is available on the server.
        GET /api/v1/files/files/conversion-health/
        """
        available = FileService.is_unoconv_available()
        return success_response(
            data={
                "unoconv_available": available,
                "message": (
                    "unoconv is installed and PPT→PDF conversion is enabled."
                    if available
                    else "unoconv is NOT installed. PPT files cannot be converted to PDF."
                ),
            },
            message="Conversion health check complete."
        )

    @action(detail=False, methods=['post'], url_path='request-token',
            parser_classes=[parsers.JSONParser])
    def request_token(self, request):
        """
        Issues a short-lived signed token for secure file access.

        POST /api/v1/files/files/request-token/
        Body: { "file_ref": "<uuid>" }
        Returns: { "token": "<signed_token>", "expires_in": 300 }

        For PPT files: token is issued against the original PPT record ID.
        The serve endpoint transparently resolves to the converted PDF.
        """
        file_ref = request.data.get('file_ref')
        if not file_ref:
            return error_response(message="file_ref is required.", status_code=400)

        try:
            file_record = FileRegistry.objects.get(pk=file_ref)
        except FileRegistry.DoesNotExist:
            return error_response(message="File not found.", status_code=404)

        # For PPT: check the converted PDF is ready
        effective = file_record.effective_pdf
        if effective is None:
            return error_response(
                message="PDF conversion is pending or failed. Please try again later.",
                status_code=503
            )

        abs_path = os.path.join(settings.MEDIA_ROOT, str(effective.file))
        if not os.path.exists(abs_path):
            return error_response(message="File not available on server.", status_code=404)

        token = self.service_class.generate_serve_token(
            file_id=str(file_record.pk),
            user_id=request.user.pk,
        )

        return success_response(
            data={"token": token, "expires_in": 300},
            message="Token issued."
        )

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """
        Uploads a file and returns the registry record.
        POST /api/v1/files/files/upload/
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return error_response(
                message="No file provided.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        employee = None
        if hasattr(request.user, 'employee_record'):
            employee = request.user.employee_record.first()

        try:
            registry = self.service_class.upload_file(
                file_obj=file_obj,
                uploaded_by_employee=employee
            )
            serializer = self.get_serializer(registry)
            return created_response(
                message="File uploaded successfully.",
                data=serializer.data
            )
        except ValidationError as e:
            return error_response(
                message=str(e.message) if hasattr(e, 'message') else str(e)
            )
        except Exception as e:
            return error_response(message=f"Upload failed: {str(e)}")


class SecureFileServeView(APIView):
    """
    Streams a file securely using a signed token.

    GET /api/v1/files/resources/<token>/

    - Validates the signed token (file_id + user_id)
    - For PPT records: transparently serves the converted PDF
    - Supports HTTP Range requests (PDF.js partial loading)
    - ETag + Last-Modified for CDN/proxy caching
    - Security headers prevent browser caching and download
    - Never exposes the real /media/ path

    Token generated by POST /api/v1/files/files/request-token/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        service = FileService()

        # 1. Validate token
        try:
            file_id = service.validate_serve_token(
                token=token,
                user_id=request.user.pk,
            )
        except BadSignature:
            raise Http404("Invalid or expired token.")

        # 2. Fetch file record
        try:
            file_record = FileRegistry.objects.get(pk=file_id)
        except FileRegistry.DoesNotExist:
            raise Http404("File not found.")

        # 3. Resolve effective file (PPT → converted PDF)
        effective = file_record.effective_pdf
        if effective is None:
            return Response(
                {
                    "success": False,
                    "message": "PDF conversion is pending or failed. Please try again later.",
                },
                status=503
            )

        # 4. Resolve absolute path
        abs_path = os.path.join(settings.MEDIA_ROOT, str(effective.file))
        if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
            raise Http404("File not available on server.")

        # 5. Detect MIME type
        mime_type, _ = mimetypes.guess_type(abs_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        # 6. Stream with security + caching headers
        range_header = request.META.get('HTTP_RANGE')
        return _build_secure_response(abs_path, mime_type, range_header)
