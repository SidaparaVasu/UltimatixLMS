# Generated for certificate renewal history.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("certificate_management", "0002_remove_certificatetemplate_created_by_and_more"),
        ("file_management", "0002_fileregistry_converted_from_converting_status"),
        ("org_management", "0002_jobrolemaster_company_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="CertificateRenewalLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("previous_expiry_date", models.DateField(blank=True, null=True)),
                ("new_expiry_date", models.DateField()),
                ("reason", models.TextField(blank=True, default="")),
                ("renewed_at", models.DateTimeField(auto_now_add=True)),
                (
                    "certificate",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="renewal_logs",
                        to="certificate_management.issuedcertificate",
                    ),
                ),
                (
                    "previous_pdf_file",
                    models.ForeignKey(
                        blank=True,
                        help_text="PDF attached to the certificate before this renewal, if any.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="certificate_renewal_previous_pdfs",
                        to="file_management.fileregistry",
                    ),
                ),
                (
                    "renewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="certificate_renewal_entries",
                        to="org_management.employeemaster",
                    ),
                ),
            ],
            options={
                "verbose_name": "Certificate Renewal Log",
                "verbose_name_plural": "Certificate Renewal Logs",
                "db_table": "cert_renewal_log",
                "ordering": ["-renewed_at"],
            },
        ),
    ]
