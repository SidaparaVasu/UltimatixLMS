// ── Question selection mode ───────────────────────────────────────────────────
export type QuestionSelectionMode = 'FIXED' | 'DYNAMIC' | 'CURATED';

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
  question_selection_mode: QuestionSelectionMode;
  number_of_questions: number;
  duration_minutes: number;
  passing_percentage: string;
  retake_limit: number;
  retake_cooldown_hours: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  negative_marking_percentage: string;
  /** Days after passing before the certificate expires. Null = lifetime validity. */
  certificate_validity_days: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  skill_mappings: SkillMappingRow[];
  /** Number of questions currently mapped (CURATED/FIXED only; 0 for DYNAMIC). */
  mapped_question_count: number;
  created_at: string;
  updated_at: string;
}

// ── List item (compact, for the table) ───────────────────────────────────────
export interface StandaloneAssessmentListItem {
  id: number;
  title: string;
  description: string;
  question_selection_mode: QuestionSelectionMode;
  number_of_questions: number;
  duration_minutes: number;
  passing_percentage: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  skill_mappings: SkillMappingRow[];
  mapped_question_count: number;
  created_at: string;
}

// ── Form values (used in create / edit form) ──────────────────────────────────
export interface AssessmentFormValues {
  title: string;
  description: string;
  question_selection_mode: QuestionSelectionMode;
  number_of_questions: number;
  duration_minutes: number;
  passing_percentage: number;
  retake_limit: number;
  retake_cooldown_hours: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  negative_marking_percentage: number;
  /** Days after passing before the certificate expires. Null = lifetime validity. */
  certificate_validity_days: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

// ── Skill mapping payload (for POST /assessment/skill-mappings/) ──────────────
export interface SkillMappingPayload {
  assessment: number;
  skill: number;
  skill_level: number;
}

// ── Question mapping (for CURATED assessments) ────────────────────────────────
export interface QuestionMappingItem {
  id: number;
  assessment: number;
  question: string;          // UUID
  display_order: number;
  weight_points: string;
  time_limit_seconds: number;
  question_detail: MappedQuestionDetail;
}

export interface MappedQuestionDetail {
  id: string;                // UUID
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'DESCRIPTIVE' | 'SCENARIO';
  scenario_text: string;
  explanation_text: string;
  difficulty_complexity: number;
  skill: number | null;
  skill_name: string | null;
  skill_level: number | null;
  skill_level_name: string | null;
  is_active: boolean;
  options: Array<{
    id: number;
    option_text: string;
    is_correct: boolean;
    display_order: number;
  }>;
}

// ── Question mapping payload ──────────────────────────────────────────────────
export interface QuestionMappingPayload {
  assessment: number;
  question: string;          // UUID
  display_order: number;
}

// ── Reorder payload ───────────────────────────────────────────────────────────
export interface ReorderMappingsPayload {
  mappings: Array<{ id: number; display_order: number }>;
}

// ── Availability check response ───────────────────────────────────────────────
export interface QuestionAvailability {
  available: number;
  required: number;
  sufficient: boolean;
  breakdown: Array<{
    skill: string;
    target_level_rank: number;
    target_level_name: string;
    available: number;
  }>;
  /** Only present when no skill mappings exist */
  message?: string;
}

// ── Staged question (local state in QuestionPickerDrawer) ─────────────────────
export interface StagedQuestion {
  /** UUID of the QuestionBank row */
  questionId: string;
  question_text: string;
  question_type: import('@/types/question-bank.types').StandaloneQuestionType;
  skill_name: string | null;
  skill_level_name: string | null;
  difficulty_complexity: number;
  /** 1-based position in the final list */
  display_order: number;
}
