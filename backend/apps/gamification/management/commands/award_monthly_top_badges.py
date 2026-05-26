from django.core.management.base import BaseCommand, CommandError

from apps.gamification.period_utils import default_previous_year_month
from apps.gamification.services.monthly_top_badge_service import MonthlyTopBadgeService


class Command(BaseCommand):
    help = (
        "Award TOP_N_MONTHLY badges (e.g. TOP_10_MONTH) for a closed calendar month. "
        "Defaults to the previous month. Schedule on the 1st of each month via cron."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Limit to a single company.",
        )
        parser.add_argument(
            "--year",
            type=int,
            default=None,
            help="Target year (default: previous calendar month).",
        )
        parser.add_argument(
            "--month",
            type=int,
            default=None,
            help="Target month 1-12 (default: previous calendar month).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report who would be awarded without creating badges.",
        )

    def handle(self, *args, **options):
        year = options.get("year")
        month = options.get("month")
        if (year is None) ^ (month is None):
            raise CommandError("Pass both --year and --month, or neither.")

        if year is None:
            year, month = default_previous_year_month()

        if month < 1 or month > 12:
            raise CommandError("--month must be between 1 and 12.")

        dry_run = options.get("dry_run", False)
        company_id = options.get("company_id")

        service = MonthlyTopBadgeService()
        run_stats = service.award_all_enabled_companies(
            year,
            month,
            company_id=company_id,
            dry_run=dry_run,
        )

        mode = "DRY RUN" if dry_run else "LIVE"
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Monthly top badges ({mode}) — {year}-{month:02d}"
            )
        )
        self.stdout.write(
            f"Companies processed: {run_stats.companies_processed}; "
            f"awarded: {run_stats.total_awarded}; "
            f"skipped (already earned): {run_stats.total_skipped}"
        )

        for company_stats in run_stats.by_company:
            if not company_stats.top_employee_ids and company_stats.rank_limit == 0:
                continue
            self.stdout.write(
                f"  company {company_stats.company_id}: "
                f"top {company_stats.rank_limit} -> ids {company_stats.top_employee_ids}; "
                f"awarded {company_stats.awarded}, skipped {company_stats.skipped_already_earned}"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("No badges were created (dry run)."))
        else:
            self.stdout.write(self.style.SUCCESS("Monthly top badge run complete."))
