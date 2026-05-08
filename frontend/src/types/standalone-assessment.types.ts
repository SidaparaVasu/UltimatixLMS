// ── Skill mapping row (used in form and API responses) ────────────────────────
export interface SkillMappingRow {
  id?: number;             // present for existing mappings, absent for new rows
  skill: number;
  skill_name: string;
  skill_level: number;
  skill_level_name: string;
  skill_level_rank: number;
}

// ── Full assessment detail (read from API) ────────────────────────────────────
export interface StandaloneAssessment {
  id: number;
  title: string;
  description: string;
  question_selection_mode: 'DYNAMIC';
  number_of_questions: number;
  duration_minutes: number;
  passing_percentage: string;
  retake_limit: number;
  retake_cooldown_hours: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  negative_marking_percentage: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  skill_mappings: SkillMappingRow[];
  created_at: string;
  updated_at: string;
}

// ── List item (compact, for the table) ───────────────────────────────────────
export interface StandaloneAssessmentListItem {
  id: number;
  title: string;
  description: string;
  number_of_questions: number;
  duration_minutes: number;
  passing_percentage: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  skill_mappings: SkillMappingRow[];
  created_at: string;
}

// ── Form values (used in create / edit form) ──────────────────────────────────
export interface AssessmentFormValues {
  title: string;
  description: string;
  number_of_questions: number;
  duration_minutes: number;
  passing_percentage: number;
  retake_limit: number;
  retake_cooldown_hours: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  negative_marking_percentage: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// ── Skill mapping payload (for POST /assessment/skill-mappings/) ──────────────
export interface SkillMappingPayload {
  assessment: number;
  skill: number;
  skill_level: number;
}
