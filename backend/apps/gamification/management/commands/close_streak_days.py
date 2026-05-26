from django.core.management.base import BaseCommand

from apps.gamification.models import CompanyGamificationConfig
from apps.gamification.services.streak_service import StreakService


class Command(BaseCommand):
    help = "Reset calendar streaks for employees who missed yesterday's qualifying activity."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Limit to a single company id.",
        )

    def handle(self, *args, **options):
        service = StreakService()
        company_id = options.get("company_id")

        if company_id:
            broken = service.break_stale_calendar_streaks(company_id=company_id)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Reset {broken} stale calendar streak(s) for company {company_id}."
                )
            )
            return

        total = 0
        company_ids = CompanyGamificationConfig.objects.filter(
            is_enabled=True
        ).values_list("company_id", flat=True)
        for cid in company_ids:
            total += service.break_stale_calendar_streaks(company_id=cid)

        self.stdout.write(
            self.style.SUCCESS(f"Reset {total} stale calendar streak(s) across enabled companies.")
        )
