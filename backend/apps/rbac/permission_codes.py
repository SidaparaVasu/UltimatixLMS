"""
Central registry for all RBAC permission code strings.

Usage:
    from apps.rbac.permission_codes import P

    class MyViewSet(viewsets.ModelViewSet):
        required_permission = P.CONTENT_MANAGEMENT.COURSE_CREATE

Rules:
    - This file is the single source of truth for permission code strings on the backend.
    - Every ViewSet, service, and test must import from here — never use raw string literals.
    - When adding a new permission, add it here first, then add it to the fixture.
    - The string values here must exactly match the permission_code values in 02_permissions.json.
"""


class PermissionCodes:
    """
    All permission codes organised by permission group.

    Aliased as P at the bottom of this file for brevity:
        from apps.rbac.permission_codes import P

    Certificate permissions:
        LEARNER_CORE.CERTIFICATE_VIEW   — pk 4  — auto-assigned to every user via LMS_USER
        SYSTEM_ADMINISTRATION.CERTIFICATE_MANAGE — pk 43 — assigned to LMS_ADMIN
    """

    class LEARNER_CORE:
        """Baseline permissions given to every user via the LMS_USER system role."""
        COURSE_VIEW            = "COURSE_VIEW"
        ENROLLMENT_SELF        = "ENROLLMENT_SELF"
        LEARNING_PROGRESS_VIEW = "LEARNING_PROGRESS_VIEW"
        CERTIFICATE_VIEW       = "CERTIFICATE_VIEW"
        SKILL_SELF_RATE        = "SKILL_SELF_RATE"
        SKILL_MATRIX_VIEW      = "SKILL_MATRIX_VIEW"
        TNI_SELF_VIEW          = "TNI_SELF_VIEW"
        ASSESSMENT_ATTEMPT     = "ASSESSMENT_ATTEMPT"
        NOTIFICATION_VIEW      = "NOTIFICATION_VIEW"
        PROFILE_MANAGE         = "PROFILE_MANAGE"

    class COMMON_READ:
        """Safe lookup, self, and common read permissions for authenticated users."""
        ORG_LOOKUP_VIEW         = "ORG_LOOKUP_VIEW"
        SKILL_LOOKUP_VIEW       = "SKILL_LOOKUP_VIEW"
        SKILL_HISTORY_SELF_VIEW = "SKILL_HISTORY_SELF_VIEW"
        SESSION_VIEW            = "SESSION_VIEW"
        ASSESSMENT_CATALOG_VIEW = "ASSESSMENT_CATALOG_VIEW"

    class HR_MANAGEMENT:
        """Employee management, org structure, TNI, and training planning."""
        EMPLOYEE_VIEW        = "EMPLOYEE_VIEW"
        EMPLOYEE_MANAGE      = "EMPLOYEE_MANAGE"
        ORG_STRUCTURE_VIEW   = "ORG_STRUCTURE_VIEW"
        ORG_STRUCTURE_MANAGE = "ORG_STRUCTURE_MANAGE"
        TNI_MANAGE           = "TNI_MANAGE"
        TNI_APPROVE          = "TNI_APPROVE"
        TRAINING_PLAN_VIEW   = "TRAINING_PLAN_VIEW"
        TRAINING_PLAN_MANAGE = "TRAINING_PLAN_MANAGE"
        ENROLLMENT_MANAGE    = "ENROLLMENT_MANAGE"
        REPORTS_VIEW         = "REPORTS_VIEW"

    class LND_APPROVAL:
        """Training plan and calendar approval — assigned to LMS_LND_APPROVER."""
        TRAINING_PLAN_APPROVE     = "TRAINING_PLAN_APPROVE"
        TRAINING_CALENDAR_VIEW    = "TRAINING_CALENDAR_VIEW"
        TRAINING_CALENDAR_APPROVE = "TRAINING_CALENDAR_APPROVE"

    class CONTENT_MANAGEMENT:
        """Course authoring, skill management, and assessment creation."""
        COURSE_CREATE             = "COURSE_CREATE"
        COURSE_UPDATE             = "COURSE_UPDATE"
        COURSE_DELETE             = "COURSE_DELETE"
        COURSE_PUBLISH            = "COURSE_PUBLISH"
        COURSE_BUILDER_ACCESS     = "COURSE_BUILDER_ACCESS"
        COURSE_CATEGORY_MANAGE    = "COURSE_CATEGORY_MANAGE"
        ASSESSMENT_MANAGE         = "ASSESSMENT_MANAGE"
        ASSESSMENT_REVIEW_MANAGE  = "ASSESSMENT_REVIEW_MANAGE"
        SKILL_UPGRADE_APPROVE     = "SKILL_UPGRADE_APPROVE"
        SKILL_MANAGE              = "SKILL_MANAGE"
        SKILL_CATEGORY_MANAGE     = "SKILL_CATEGORY_MANAGE"
        SKILL_MAPPING_MANAGE      = "SKILL_MAPPING_MANAGE"

    class SYSTEM_ADMINISTRATION:
        """RBAC management, system config, audit, and reporting — assigned to LMS_ADMIN."""
        ROLE_VIEW          = "ROLE_VIEW"
        ROLE_CREATE        = "ROLE_CREATE"
        ROLE_UPDATE        = "ROLE_UPDATE"
        ROLE_DELETE        = "ROLE_DELETE"
        USER_ROLE_ASSIGN   = "USER_ROLE_ASSIGN"
        CONFIG_VIEW        = "CONFIG_VIEW"
        CONFIG_MANAGE      = "CONFIG_MANAGE"
        AUDIT_VIEW         = "AUDIT_VIEW"
        REPORTS_EXPORT     = "REPORTS_EXPORT"
        CERTIFICATE_MANAGE = "CERTIFICATE_MANAGE"

    class AUDIT_ACCESS:
        """Read-only audit and reporting access — assigned to LMS_AUDITOR."""
        AUDIT_VIEW     = "AUDIT_VIEW"
        REPORTS_VIEW   = "REPORTS_VIEW"
        REPORTS_EXPORT = "REPORTS_EXPORT"

    class GAMIFICATION:
        """Learner engagement: points, badges, leaderboards, and streaks."""
        VIEW_OWN           = "GAMIFICATION_VIEW_OWN"
        VIEW_LEADERBOARD   = "GAMIFICATION_VIEW_LEADERBOARD"
        VIEW_TEAM          = "GAMIFICATION_VIEW_TEAM"
        MANAGE_CONFIG      = "GAMIFICATION_MANAGE_CONFIG"


# Short alias used throughout the codebase
P = PermissionCodes
