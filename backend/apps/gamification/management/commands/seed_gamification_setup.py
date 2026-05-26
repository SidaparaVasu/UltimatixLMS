"""
Idempotent gamification bootstrap for existing databases.

Use when loaddata on full RBAC fixtures would fail (duplicate PKs) but award rules,
badges, permissions, and company toggles still need to be applied.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import FeatureKeys
from apps.gamification.models import CompanyGamificationConfig
from apps.org_management.models import CompanyMaster
from apps.rbac.models import PermissionGroupMaster, PermissionMaster, RoleMaster, RolePermissionMaster

GAMIFICATION_PERMISSIONS = [
    (
        "GAMIFICATION_VIEW_OWN",
        "View Own Gamification",
        "View own XP, badges, streaks, and transaction history.",
    ),
    (
        "GAMIFICATION_VIEW_LEADERBOARD",
        "View Leaderboard",
        "View company leaderboards with department and org filters.",
    ),
    (
        "GAMIFICATION_VIEW_TEAM",
        "View Team Gamification",
        "View gamification stats for direct and indirect reports.",
    ),
    (
        "GAMIFICATION_MANAGE_CONFIG",
        "Manage Gamification Config",
        "Configure company gamification rules and award settings.",
    ),
]

ROLE_PERMISSION_CODES = {
    "LMS_USER": ["GAMIFICATION_VIEW_OWN", "GAMIFICATION_VIEW_LEADERBOARD"],
    "LMS_ADMIN": [
        "GAMIFICATION_VIEW_OWN",
        "GAMIFICATION_VIEW_LEADERBOARD",
        "GAMIFICATION_VIEW_TEAM",
        "GAMIFICATION_MANAGE_CONFIG",
    ],
    "LMS_HR": [
        "GAMIFICATION_VIEW_OWN",
        "GAMIFICATION_VIEW_LEADERBOARD",
        "GAMIFICATION_VIEW_TEAM",
    ],
}


class Command(BaseCommand):
    help = (
        "Seed gamification RBAC (idempotent), load award/badge fixtures if missing, "
        "and optionally enable global and company toggles."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Company to create/update CompanyGamificationConfig for.",
        )
        parser.add_argument(
            "--enable-global",
            action="store_true",
            help="Set feature flag gamification_enabled=True.",
        )
        parser.add_argument(
            "--enable-company",
            action="store_true",
            help="Set CompanyGamificationConfig.is_enabled=True (requires --company-id).",
        )
        parser.add_argument(
            "--skip-fixtures",
            action="store_true",
            help="Do not run loaddata for award rules and badge definitions.",
        )
        parser.add_argument(
            "--skip-rbac",
            action="store_true",
            help="Skip permission group, permissions, and role links.",
        )

    def handle(self, *args, **options):
        if options["enable_company"] and not options["company_id"]:
            raise CommandError("--enable-company requires --company-id.")

        if not options["skip_fixtures"]:
            self._load_catalog_fixtures()

        if not options["skip_rbac"]:
            self._seed_rbac()

        if options["enable_global"]:
            updated = FeatureFlag.objects.filter(
                feature_key=FeatureKeys.GAMIFICATION_ENABLED
            ).update(is_enabled=True)
            if updated == 0:
                raise CommandError(
                    "Feature flag gamification_enabled not found. "
                    "Run: python manage.py loaddata initial_feature_flags"
                )
            self.stdout.write(self.style.SUCCESS("Enabled global gamification feature flag."))

        if options["company_id"]:
            company = CompanyMaster.objects.filter(id=options["company_id"]).first()
            if not company:
                raise CommandError(f"Company id {options['company_id']} not found.")
            config, created = CompanyGamificationConfig.objects.get_or_create(
                company=company,
                defaults={"is_enabled": False},
            )
            if options["enable_company"]:
                config.is_enabled = True
                config.save(update_fields=["is_enabled", "updated_at"])
            action = "Created" if created else "Updated"
            state = "enabled" if config.is_enabled else "disabled"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} CompanyGamificationConfig for company {company.id} ({state})."
                )
            )

        self.stdout.write(self.style.SUCCESS("Gamification setup complete."))

    def _load_catalog_fixtures(self):
        for label in ("initial_award_rules", "initial_badge_definitions"):
            try:
                call_command("loaddata", label, verbosity=0)
                self.stdout.write(f"Loaded fixture: {label}")
            except Exception as exc:
                self.stdout.write(
                    self.style.WARNING(f"Skipped {label} ({exc}). Already loaded?")
                )

    def _seed_rbac(self):
        group, group_created = PermissionGroupMaster.objects.get_or_create(
            group_code="GAMIFICATION",
            defaults={
                "group_name": "Gamification",
                "description": "Learner engagement: points, badges, leaderboards, and streaks.",
                "display_order": 8,
                "is_active": True,
            },
        )
        if group_created:
            self.stdout.write("Created permission group GAMIFICATION.")

        permission_by_code: dict[str, PermissionMaster] = {}
        for code, name, description in GAMIFICATION_PERMISSIONS:
            perm, created = PermissionMaster.objects.get_or_create(
                permission_code=code,
                defaults={
                    "permission_group": group,
                    "permission_name": name,
                    "description": description,
                    "is_active": True,
                },
            )
            if not created and perm.permission_group_id != group.id:
                perm.permission_group = group
                perm.save(update_fields=["permission_group", "updated_at"])
            permission_by_code[code] = perm
            if created:
                self.stdout.write(f"Created permission {code}.")

        links_created = 0
        for role_code, perm_codes in ROLE_PERMISSION_CODES.items():
            role = RoleMaster.objects.filter(role_code=role_code, is_active=True).first()
            if not role:
                self.stdout.write(
                    self.style.WARNING(f"Role {role_code} not found; skipping role links.")
                )
                continue
            for perm_code in perm_codes:
                perm = permission_by_code[perm_code]
                _, created = RolePermissionMaster.objects.get_or_create(
                    role=role,
                    permission=perm,
                )
                if created:
                    links_created += 1

        self.stdout.write(
            self.style.SUCCESS(f"RBAC seed done ({links_created} new role-permission link(s)).")
        )
