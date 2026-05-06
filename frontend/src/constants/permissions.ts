/**
 * Central registry for all RBAC permission code constants.
 *
 * These values exactly mirror `backend/apps/rbac/permission_codes.py`.
 * Always import from here — never use raw string literals in components or guards.
 *
 * Usage:
 *   import { PERMISSIONS } from '@/constants/permissions';
 *   const canView = usePermission(PERMISSIONS.ROLE_VIEW);
 */

export const PERMISSIONS = {
  // ── LEARNER_CORE (10) ────────────────────────────────────────────────────
  // Baseline permissions given to every user via the LMS_USER system role.
  COURSE_VIEW:             'COURSE_VIEW',
  ENROLLMENT_SELF:         'ENROLLMENT_SELF',
  LEARNING_PROGRESS_VIEW:  'LEARNING_PROGRESS_VIEW',
  CERTIFICATE_VIEW:        'CERTIFICATE_VIEW',
  SKILL_SELF_RATE:         'SKILL_SELF_RATE',
  SKILL_MATRIX_VIEW:       'SKILL_MATRIX_VIEW',
  TNI_SELF_VIEW:           'TNI_SELF_VIEW',
  ASSESSMENT_ATTEMPT:      'ASSESSMENT_ATTEMPT',
  NOTIFICATION_VIEW:       'NOTIFICATION_VIEW',
  PROFILE_MANAGE:          'PROFILE_MANAGE',

  // ── HR_MANAGEMENT (10) ───────────────────────────────────────────────────
  // Employee management, org structure, TNI, and training planning.
  EMPLOYEE_VIEW:           'EMPLOYEE_VIEW',
  EMPLOYEE_MANAGE:         'EMPLOYEE_MANAGE',
  ORG_STRUCTURE_VIEW:      'ORG_STRUCTURE_VIEW',
  ORG_STRUCTURE_MANAGE:    'ORG_STRUCTURE_MANAGE',
  TNI_MANAGE:              'TNI_MANAGE',
  TNI_APPROVE:             'TNI_APPROVE',
  TRAINING_PLAN_VIEW:      'TRAINING_PLAN_VIEW',
  TRAINING_PLAN_MANAGE:    'TRAINING_PLAN_MANAGE',
  ENROLLMENT_MANAGE:       'ENROLLMENT_MANAGE',
  REPORTS_VIEW:            'REPORTS_VIEW',

  // ── LND_APPROVAL (3) ────────────────────────────────────────────────────
  // Training plan and calendar approval — assigned to LMS_LND_APPROVER.
  TRAINING_PLAN_APPROVE:     'TRAINING_PLAN_APPROVE',
  TRAINING_CALENDAR_VIEW:    'TRAINING_CALENDAR_VIEW',
  TRAINING_CALENDAR_APPROVE: 'TRAINING_CALENDAR_APPROVE',

  // ── CONTENT_MANAGEMENT (11) ─────────────────────────────────────────────
  // Course authoring, skill management, and assessment creation.
  COURSE_CREATE:              'COURSE_CREATE',
  COURSE_UPDATE:              'COURSE_UPDATE',
  COURSE_DELETE:              'COURSE_DELETE',
  COURSE_PUBLISH:             'COURSE_PUBLISH',
  COURSE_BUILDER_ACCESS:      'COURSE_BUILDER_ACCESS',
  COURSE_CATEGORY_MANAGE:     'COURSE_CATEGORY_MANAGE',
  ASSESSMENT_MANAGE:          'ASSESSMENT_MANAGE',
  ASSESSMENT_REVIEW_MANAGE:   'ASSESSMENT_REVIEW_MANAGE',
  SKILL_MANAGE:               'SKILL_MANAGE',
  SKILL_CATEGORY_MANAGE:      'SKILL_CATEGORY_MANAGE',
  SKILL_MAPPING_MANAGE:       'SKILL_MAPPING_MANAGE',

  // ── SYSTEM_ADMINISTRATION (10) ──────────────────────────────────────────
  // RBAC management, system config, audit, and reporting — assigned to LMS_ADMIN.
  ROLE_VIEW:               'ROLE_VIEW',
  ROLE_CREATE:             'ROLE_CREATE',
  ROLE_UPDATE:             'ROLE_UPDATE',
  ROLE_DELETE:             'ROLE_DELETE',
  USER_ROLE_ASSIGN:        'USER_ROLE_ASSIGN',
  CONFIG_VIEW:             'CONFIG_VIEW',
  CONFIG_MANAGE:           'CONFIG_MANAGE',
  AUDIT_VIEW:              'AUDIT_VIEW',
  REPORTS_EXPORT:          'REPORTS_EXPORT',
  CERTIFICATE_MANAGE:      'CERTIFICATE_MANAGE',

  // ── AUDIT_ACCESS (3) ────────────────────────────────────────────────────
  // Read-only audit and reporting access — assigned to LMS_AUDITOR.
  // Note: AUDIT_VIEW, REPORTS_VIEW, REPORTS_EXPORT are shared with
  // SYSTEM_ADMINISTRATION; the same string values are intentionally reused.
} as const;

/**
 * Union type of all valid permission code strings.
 * The TypeScript compiler will catch any unknown code at compile time.
 *
 * Example:
 *   const check = (code: PermissionCode) => usePermission(code);
 *   check('INVALID_CODE'); // TS error
 */
export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];
