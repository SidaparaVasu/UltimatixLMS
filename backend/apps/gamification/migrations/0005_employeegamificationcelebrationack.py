import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("gamification", "0004_badgedefinition_employeebadge"),
        ("org_management", "0002_jobrolemaster_company_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmployeeCelebrationAck",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("snapshot", models.JSONField(blank=True, default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="celebration_acks",
                        to="org_management.companymaster",
                    ),
                ),
                (
                    "employee",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gamification_celebration_ack",
                        to="org_management.employeemaster",
                    ),
                ),
            ],
            options={
                "db_table": "gamification_employee_celebration_ack",
            },
        ),
    ]
