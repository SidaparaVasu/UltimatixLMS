/**
 * TNI (Training Needs Identification) types
 *
 * Covers:
 *   - Skill rating workflow (self + manager)
 *   - Skill matrix composite view
 *   - Training needs and approvals
 */

import { SkillLevel } from './skills.types';

// ---------------------------------------------------------------------------
// Shared enums / literals
// ---------------------------------------------------------------------------

export type RatingType   = 'SELF' | 'MANAGER';
export type RatingStatus = 'DRAFT' | 'SUBMITTED';

export type GapSeverity = 'NONE' | 'MINOR' | 'CRITICAL' | 'NOT_RATED';

export type SkillIdentifiedBy = 'SELF' | 'MANAGER' | 'SYSTEM' | 'ASSESSMENT';

export type TNISourceType =
  | 'SELF'
  | 'MANAGER'
  | 'SKILL_GAP'
  | 'COMPLIANCE'
  | 'SYSTEM';

export type TNIPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TNIStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PLANNED'
  | 'COMPLETED';

export type TNIApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ---------------------------------------------------------------------------
// Skill rating
// ---------------------------------------------------------------------------

/**
 * One active rating row per [employee, skill, rating_type].
 * Mirrors EmployeeSkillRating on the backend.
 */
export interface EmployeeSkillRating {
  id: number;
  employee: number;
  skill: number;
  skill_name: string;
  rated_by: number;
  rated_by_name: string;
  rating_type: RatingType;
  rated_level: number;
  rated_level_name: string;
  rated_level_rank: number;
  status: RatingStatus;
  submitted_at: string | null;
  /** Performance hindrances — SELF ratings only */
  observations: string;
  /** Recent accomplishments — SELF ratings only */
  accomplishments: string;
  /** Reviewer notes — MANAGER ratings only */
  notes: string;
  created_at: string;
  updated_at: string;
}

/**
 * Append-only audit log entry for a rating change.
 * Mirrors EmployeeSkillRatingHistory on the backend.
 */
export interface EmployeeSkillRatingHistory {
  id: number;
  employee: number;
  skill: number;
  skill_name: string;
  rating_type: RatingType;
  rated_by: number;
  rated_by_name: string;
  old_level: number | null;
  old_level_name: string | null;
  new_level: number | null;
  new_level_name: string | null;
  old_status: string;
  new_status: string;
  notes_snapshot: string;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Skill matrix
// ---------------------------------------------------------------------------

/** Nested level object used inside SkillMatrixRow */
export interface SkillLevelNested {
  id: number;
  level_name: string;
  level_rank: number;
}

/** Nested rating summary used inside SkillMatrixRow */
export interface RatingNested {
  id: number;
  rated_level: SkillLevelNested;
  status: RatingStatus;
  submitted_at: string | null;
}

/** Extended self-rating with observations and accomplishments */
export interface SelfRatingDetail {
  id: number;
  rated_level: SkillLevelNested;
  status: RatingStatus;
  submitted_at: string | null;
  observations: string;
  accomplishments: string;
}

/** Extended manager-rating with notes */
export interface ManagerRatingDetail {
  id: number;
  rated_level: SkillLevelNested;
  status: RatingStatus;
  submitted_at: string | null;
  notes: string;
}

/**
 * One row in the manager review matrix.
 * Returned by GET /api/v1/skills/skill-ratings/manager-review-matrix/?employee_id=X
 */
export interface ManagerReviewRow {
  skill_id: number;
  skill_name: string;
  skill_code: string;
  category_id: number | null;
  category_name: string | null;
  /** true = required by job role, false = extra skill the employee added */
  is_role_skill: boolean;
  required_level: SkillLevelNested | null;
  self_rating: SelfRatingDetail | null;
  manager_rating: ManagerRatingDetail | null;
}

/** Team member with submitted self-ratings */
export interface TeamMemberOption {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
}


/**
 * One row in the composite skill matrix view.
 * Returned by GET /api/v1/skills/my-skill-matrix/
 */
export interface SkillMatrixRow {
  skill_id: number;
  skill_name: string;
  skill_code: string;
  category_id: number | null;
  category_name: string | null;
  required_level: SkillLevelNested | null;
  current_level: SkillLevelNested | null;
  identified_by: SkillIdentifiedBy | null;
  self_rating: RatingNested | null;
  manager_rating: RatingNested | null;
  gap_value: number | null;
  gap_severity: GapSeverity | null;
}

// ---------------------------------------------------------------------------
// Training needs
// ---------------------------------------------------------------------------

/**
 * A single identified training need.
 * Mirrors TrainingNeed on the backend.
 */
export interface TrainingNeed {
  id: number;
  employee: number;
  employee_code: string;
  employee_name: string;
  skill: number;
  skill_name: string;
  source_type: TNISourceType;
  priority: TNIPriority;
  status: TNIStatus;
  notes: string;
  identified_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Gap info from the latest SkillGapSnapshot */
  gap_value: number | null;
  required_level_name: string | null;
  current_level_name: string | null;
}

/**
 * An approval action on a training need.
 * Mirrors TrainingNeedApproval on the backend.
 */
export interface TrainingNeedApproval {
  id: number;
  training_need: number;
  training_need_display: string;
  approver: number;
  approver_name: string;
  approval_status: TNIApprovalStatus;
  comments: string;
  /** Timestamp when the action was taken (approve or reject). */
  actioned_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API payload types
// ---------------------------------------------------------------------------

/** One item in a bulk self-rating save request */
export interface SelfRatingItem {
  skill_id: number;
  level_id: number;
  observations?: string;
  accomplishments?: string;
}

/** POST /skills/skill-ratings/save-draft/ */
export interface SelfRatingBulkSavePayload {
  ratings: SelfRatingItem[];
}

/** One item in a manager rating save/submit request */
export interface ManagerRatingItem {
  skill_id: number;
  level_id: number;
  notes?: string;
}

/** POST /skills/skill-ratings/manager-save/ and manager-submit/ */
export interface ManagerRatingSubmitPayload {
  employee_id: number;
  ratings: ManagerRatingItem[];
}

/** Response from manager-submit/ */
export interface ManagerSubmitSummary {
  submitted_count: number;
  skills_updated: number;
  gaps_found: number;
  training_needs_created: number;
}

/** Response from self-rating submit/ */
export interface SelfRatingSubmitResult {
  ratings: EmployeeSkillRating[];
  bypassed_manager_review: boolean;
  gaps_found: number;
  training_needs_created: number;
}

/** POST /tni/approvals/{id}/finalize/ */
export interface ApprovalFinalizePayload {
  status: TNIApprovalStatus;
  comments?: string;
}

// ---------------------------------------------------------------------------
// Query param types
// ---------------------------------------------------------------------------

export interface SkillRatingListParams {
  employee_id?: number;
  rating_type?: RatingType;
  status?: RatingStatus;
  page?: number;
  page_size?: number;
}

export interface SkillRatingHistoryParams {
  employee_id?: number;
  rating_type?: RatingType;
  skill_id?: number;
  page?: number;
  page_size?: number;
}

export interface TrainingNeedListParams {
  status?: TNIStatus;
  priority?: TNIPriority;
  source_type?: TNISourceType;
  employee_id?: number;
  department_id?: number;
  page?: number;
  page_size?: number;
}
