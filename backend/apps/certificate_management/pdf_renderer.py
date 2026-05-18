"""
Certificate PDF Renderer.

Generates certificate PDFs using reportlab (>=4.0).

All certificates use the default layout — no custom block templates.
The layout includes:
  - Decorative border frame
  - "Ultimatix LMS" diagonal watermark in light grey
  - QR code (bottom-right) encoding the public verification URL
  - Certificate UUID printed below the QR code

Public API
----------
    renderer = CertificatePDFRenderer()
    pdf_bytes = renderer.render_for_course(enrollment, completion_date, expiry_date)
    pdf_bytes = renderer.render_for_assessment(attempt, completion_date, expiry_date)

Both methods return raw bytes that can be streamed directly or saved to FileRegistry.
"""

import io
import logging
from datetime import date

logger = logging.getLogger(__name__)

# Base URL for verification links — override via Django settings FRONTEND_BASE_URL
_DEFAULT_BASE_URL = "https://app.ultimatixlms.com"


def _get_base_url() -> str:
    try:
        from django.conf import settings
        return getattr(settings, "FRONTEND_BASE_URL", _DEFAULT_BASE_URL).rstrip("/")
    except Exception:
        return _DEFAULT_BASE_URL


# ---------------------------------------------------------------------------
# CertificatePDFRenderer
# ---------------------------------------------------------------------------

class CertificatePDFRenderer:
    """
    Generates certificate PDFs using reportlab.

    All certificates use the default layout with the Ultimatix LMS watermark.
    """

    # ── Public entry points ───────────────────────────────────────────────────

    def render_for_course(
        self,
        enrollment,
        completion_date: date,
        expiry_date: date | None,
        certificate_uuid: str = "",
    ) -> bytes:
        context = self._build_course_context(
            enrollment, completion_date, expiry_date, certificate_uuid
        )
        return self._render_default(context)

    def render_for_assessment(
        self,
        attempt,
        completion_date: date,
        expiry_date: date | None,
        certificate_uuid: str = "",
    ) -> bytes:
        context = self._build_assessment_context(
            attempt, completion_date, expiry_date, certificate_uuid
        )
        return self._render_default(context)

    # ── Context builders ──────────────────────────────────────────────────────

    def _build_course_context(self, enrollment, completion_date: date, expiry_date, certificate_uuid: str = "") -> dict:
        employee = enrollment.employee
        profile = getattr(getattr(employee, "user", None), "profile", None)
        full_name = (
            f"{profile.first_name} {profile.last_name}".strip()
            if profile
            else employee.employee_code
        )
        return {
            "user_fullname":       full_name,
            "entity_name":         enrollment.course.course_title,
            "entity_label":        "Course",
            "completion_date":     completion_date.strftime("%d %B %Y"),
            "expiry_date":         expiry_date.strftime("%d %B %Y") if expiry_date else None,
            "issued_by":           "Ultimatix LMS",
            "employee_id":         employee.employee_code,
            "certificate_uuid":    certificate_uuid,
        }

    def _build_assessment_context(self, attempt, completion_date: date, expiry_date, certificate_uuid: str = "") -> dict:
        employee = attempt.employee
        profile = getattr(getattr(employee, "user", None), "profile", None)
        full_name = (
            f"{profile.first_name} {profile.last_name}".strip()
            if profile
            else employee.employee_code
        )
        return {
            "user_fullname":       full_name,
            "entity_name":         attempt.assessment.title,
            "entity_label":        "Assessment",
            "completion_date":     completion_date.strftime("%d %B %Y"),
            "expiry_date":         expiry_date.strftime("%d %B %Y") if expiry_date else None,
            "issued_by":           "Ultimatix LMS",
            "employee_id":         employee.employee_code,
            "certificate_uuid":    certificate_uuid,
        }

    # ── Default layout ────────────────────────────────────────────────────────

    def _render_default(self, context: dict) -> bytes:
        """
        Landscape A4 certificate layout with:
          - Decorative double-border frame
          - Diagonal "Ultimatix LMS" watermark in light grey
          - Certificate content (title, learner name, entity name, dates)
          - QR code (bottom-right) encoding the verification URL
          - Certificate UUID below the QR code
        """
        self._require_reportlab()
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        from reportlab.pdfgen import canvas as pdfgen_canvas

        page_width, page_height = landscape(A4)
        buffer = io.BytesIO()

        # ── Canvas-level drawing (watermark + border + QR) ────────────────────
        def _draw_canvas_elements(canvas_obj, doc):
            canvas_obj.saveState()

            # Outer border
            canvas_obj.setStrokeColor(colors.HexColor("#1e3a5f"))
            canvas_obj.setLineWidth(3)
            canvas_obj.rect(0.8 * cm, 0.8 * cm,
                            page_width - 1.6 * cm, page_height - 1.6 * cm)

            # Inner border (decorative double-line effect)
            canvas_obj.setStrokeColor(colors.HexColor("#2c5282"))
            canvas_obj.setLineWidth(1)
            canvas_obj.rect(1.1 * cm, 1.1 * cm,
                            page_width - 2.2 * cm, page_height - 2.2 * cm)

            # Diagonal watermark
            canvas_obj.setFont("Helvetica-Bold", 72)
            canvas_obj.setFillColor(colors.HexColor("#e8edf5"))
            canvas_obj.saveState()
            canvas_obj.translate(page_width / 2, page_height / 2)
            canvas_obj.rotate(30)
            canvas_obj.drawCentredString(0, 0, "Ultimatix LMS")
            canvas_obj.restoreState()

            # QR code (bottom-right corner)
            cert_uuid = context.get("certificate_uuid", "")
            if cert_uuid:
                verification_url = f"{_get_base_url()}/verify/certificate/{cert_uuid}"
                qr_image = self._generate_qr_image(verification_url)
                if qr_image:
                    qr_size = 2.8 * cm
                    qr_x = page_width - qr_size - 3.5 * cm
                    qr_y = 1.8 * cm
                    canvas_obj.drawImage(
                        qr_image, qr_x, qr_y,
                        width=qr_size, height=qr_size,
                        preserveAspectRatio=True,
                    )
                    # UUID text below QR
                    canvas_obj.setFont("Courier", 6)
                    canvas_obj.setFillColor(colors.HexColor("#718096"))
                    canvas_obj.drawCentredString(
                        qr_x + qr_size / 2,
                        qr_y - 0.3 * cm,
                        str(cert_uuid)[:36],
                    )

            canvas_obj.restoreState()

        # ── Flowable story ────────────────────────────────────────────────────
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "CertTitle",
            parent=styles["Title"],
            fontSize=30,
            textColor=colors.HexColor("#1e3a5f"),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        )
        subtitle_style = ParagraphStyle(
            "CertSubtitle",
            parent=styles["Normal"],
            fontSize=11,
            textColor=colors.HexColor("#4a5568"),
            spaceAfter=2,
            alignment=TA_CENTER,
            fontName="Helvetica",
        )
        heading_style = ParagraphStyle(
            "CertHeading",
            parent=styles["Heading2"],
            fontSize=20,
            textColor=colors.HexColor("#1e3a5f"),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        )
        body_style = ParagraphStyle(
            "CertBody",
            parent=styles["Normal"],
            fontSize=13,
            textColor=colors.HexColor("#2d3748"),
            spaceAfter=4,
            alignment=TA_CENTER,
            fontName="Helvetica",
        )
        meta_style = ParagraphStyle(
            "CertMeta",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#718096"),
            spaceAfter=3,
            alignment=TA_CENTER,
            fontName="Helvetica",
        )

        entity_label = context.get("entity_label", "Course")
        expiry_line = (
            f"Valid Until: {context['expiry_date']}"
            if context.get("expiry_date")
            else "Lifetime Validity"
        )

        story = [
            Spacer(1, 0.8 * cm),
            Paragraph("Certificate of Completion", title_style),
            Paragraph(f"This certifies successful completion of a {entity_label}", subtitle_style),
            Spacer(1, 0.3 * cm),
            HRFlowable(
                width="70%", thickness=2,
                color=colors.HexColor("#2c5282"),
                spaceAfter=12,
            ),
            Spacer(1, 0.2 * cm),
            Paragraph("This is to certify that", body_style),
            Spacer(1, 0.2 * cm),
            Paragraph(
                f"<b>{context.get('user_fullname', '')}</b>",
                heading_style,
            ),
            Spacer(1, 0.2 * cm),
            Paragraph(
                f"has successfully completed the {entity_label.lower()}",
                body_style,
            ),
            Spacer(1, 0.2 * cm),
            Paragraph(
                f"<b>{context.get('entity_name', '')}</b>",
                heading_style,
            ),
            Spacer(1, 0.4 * cm),
            Paragraph(
                f"Completion Date: <b>{context.get('completion_date', '')}</b>",
                body_style,
            ),
            Paragraph(expiry_line, body_style),
            Spacer(1, 0.4 * cm),
            HRFlowable(
                width="35%", thickness=1,
                color=colors.HexColor("#cbd5e0"),
                spaceAfter=6,
            ),
            Paragraph(context.get("issued_by", "Ultimatix LMS"), meta_style),
            Paragraph(
                f"Employee ID: {context.get('employee_id', '')}",
                meta_style,
            ),
        ]

        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=2.5 * cm,
            leftMargin=2.5 * cm,
            topMargin=1.8 * cm,
            bottomMargin=2.5 * cm,
        )
        doc.build(story, onFirstPage=_draw_canvas_elements, onLaterPages=_draw_canvas_elements)
        return buffer.getvalue()

    # ── QR code helper ────────────────────────────────────────────────────────

    def _generate_qr_image(self, url: str):
        """
        Generates a QR code image for the given URL.
        Returns a reportlab ImageReader-compatible object, or None if qrcode
        or Pillow is not installed.
        """
        try:
            import qrcode
            from reportlab.lib.utils import ImageReader
            from PIL import Image as PILImage

            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=2,
            )
            qr.add_data(url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            # Convert to bytes for reportlab
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            return ImageReader(img_buffer)
        except ImportError:
            logger.debug(
                "qrcode or Pillow not installed — QR code omitted from certificate PDF. "
                "Install with: pip install qrcode[pil]"
            )
            return None
        except Exception as exc:
            logger.warning("QR code generation failed: %s", exc)
            return None

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _require_reportlab() -> None:
        """Raises a clear RuntimeError if reportlab is not installed."""
        try:
            import reportlab  # noqa: F401
        except ImportError:
            raise RuntimeError(
                "reportlab is required for PDF generation. "
                "Install it with: pip install reportlab==4.4.5"
            )
