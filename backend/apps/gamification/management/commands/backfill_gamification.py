from django.core.management.base import BaseCommand, CommandError

from apps.gamification.services.gamification_backfill_service import (
    BackfillStats,
    GamificationBackfillService,
)


class Command(BaseCommand):
    help = (
        "Backfill gamification XP (and optionally badges) from historical learning data. "
        "Idempotent — safe to re-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Limit backfill to a single company.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print counts only; do not write ledger rows or badges.",
        )
        parser.add_argument(
            "--xp-percent",
            type=int,
            default=50,
            help="Percentage of calculated XP to award for historical events (default: 50).",
        )
        parser.add_argument(
            "--include-badges",
            action="store_true",
            help="After XP backfill, evaluate and award badges already earned by criteria.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Include companies whose gamification config is disabled.",
        )

    def handle(self, *args, **options):
        service = GamificationBackfillService(
            xp_percent=options["xp_percent"],
            dry_run=options["dry_run"],
            include_badges=options["include_badges"],
            force=options["force"],
        )

        try:
            stats = service.run(company_id=options["company_id"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        if not stats.companies:
            raise CommandError(
                "No matching company gamification config found. "
                "Create config and enable gamification, or pass --force."
            )

        self._print_stats(
            stats,
            dry_run=options["dry_run"],
            include_badges=options["include_badges"],
        )

    def _print_stats(self, stats: BackfillStats, *, dry_run: bool, include_badges: bool):
        mode = "DRY RUN" if dry_run else "APPLIED"
        self.stdout.write(self.style.MIGRATE_HEADING(f"Gamification backfill ({mode})"))
        self.stdout.write(f"Companies processed: {stats.companies}")
        self._print_category("Courses", stats.courses)
        self._print_category("Assessment passes", stats.assessments)
        self._print_category("Skill upgrades", stats.skill_upgrades)
        self._print_category("Certificates", stats.certificates)
        self.stdout.write(
            f"Total XP awards {'to create' if dry_run else 'created'}: {stats.total_created}"
        )
        self.stdout.write(f"Total skipped (already awarded): {stats.total_skipped}")
        if include_badges:
            self.stdout.write(
                f"Badge evaluation: {stats.employees_badge_evaluated} employees, "
                f"{stats.badges_awarded} badges awarded"
            )

    def _print_category(self, label: str, category):
        self.stdout.write(
            f"  {label}: processed={category.processed} "
            f"created={category.created} skipped={category.skipped} "
            f"zero_after_scale={category.skipped_zero}"
        )
