/**
 * Frozen badge catalog — must match backend fixture + Appendix A.
 * Asset files: public/assets/gamification/badges/{code}.png (or .svg placeholder)
 */

export const BADGE_CATALOG_CODES = [
  'FIRST_COURSE',
  'COURSES_5',
  'COURSES_10',
  'FAST_LEARNER',
  'MANDATORY_HERO',
  'COMPLIANCE_COMPLETE',
  'OVERDUE_RECOVERY',
  'PATH_FINISHER',
  'FIRST_PASS',
  'ASSESSES_10',
  'PERFECT_SCORE',
  'HIGH_ACHIEVER',
  'FIRST_TRY_PASS',
  'PASS_STREAK_5',
  'DAILY_ATTEMPT_7',
  'FIRST_SKILL_UP',
  'SKILL_UP_3',
  'MULTI_SKILL',
  'FIRST_CERT',
  'CERT_COLLECTOR',
  'LEARN_STREAK_7',
  'LEARN_STREAK_30',
  'LEARN_STREAK_90',
  'PASS_STREAK_DAY_7',
  'XP_1000',
  'XP_5000',
  'TOP_10_MONTH',
] as const;

export type BadgeCatalogCode = (typeof BADGE_CATALOG_CODES)[number];

/**
 * Optional per-badge celebration GIF overrides (filename without .gif).
 * Default: tier-common | tier-rare | tier-epic from badge category.
 */
export const BADGE_CELEBRATION_GIF_OVERRIDES: Partial<Record<string, string>> = {
  // first_course: 'badge-first_course',
};
