// ── Change reason choices (mirrors EmployeeSkillHistory.ChangeReason) ────────
export type SkillChangeReason =
  | 'SELF_RATING'
  | 'MANAGER_RATING'
  | 'ASSESSMENT_AUTO'
  | 'ASSESSMENT_APPROVED'
  | 'ADMIN_OVERRIDE';

// ── Single history entry ──────────────────────────────────────────────────────
export interface SkillHistoryEntry {
  id: number;
  employee: number;
  employee_name: string;
  employee_code: string;
  skill: number;
  skill_name: string;
  old_level: number | null;
  old_level_name: string | null;
  old_level_rank: number | null;
  new_level: number | null;
  new_level_name: string | null;
  new_level_rank: number | null;
  changed_by: number | null;
  changed_by_name: string | null;
  change_reason: SkillChangeReason;
  change_reason_display: string;
  remarks: string;
  changed_at: string;
}

// ── Query params for the list endpoint ───────────────────────────────────────
export interface SkillHistoryParams {
  employee_id?: number;
  skill_id?: number;
  change_reason?: SkillChangeReason;
  /** Pass true to fetch only the requesting user's own history */
  my?: boolean;
  page?: number;
  page_size?: number;
}
