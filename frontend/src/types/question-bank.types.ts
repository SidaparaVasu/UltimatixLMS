// ── Question types supported in standalone assessments ───────────────────────
export type StandaloneQuestionType =
  | 'MCQ'
  | 'MSQ'
  | 'TRUE_FALSE'
  | 'DESCRIPTIVE'
  | 'SCENARIO';

// ── Option ────────────────────────────────────────────────────────────────────
export interface QuestionOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  display_order: number;
  feedback_text: string;
}

// ── Question Bank Item (read) ─────────────────────────────────────────────────
export interface QuestionBankItem {
  id: string;                          // UUID
  question_text: string;
  question_type: StandaloneQuestionType;
  scenario_text: string;
  explanation_text: string;
  difficulty_complexity: number;       // 1–5
  skill: number | null;
  skill_name: string | null;
  skill_level: number | null;
  skill_level_name: string | null;
  is_active: boolean;
  created_by_name: string | null;
  created_at: string;
  options: QuestionOption[];
}

// ── Create / Write payload ────────────────────────────────────────────────────
export interface CreateQuestionOptionPayload {
  option_text: string;
  is_correct: boolean;
  display_order: number;
  feedback_text?: string;
}

export interface CreateQuestionPayload {
  question_text: string;
  question_type: StandaloneQuestionType;
  scenario_text?: string;
  explanation_text?: string;
  difficulty_complexity: number;
  skill?: number | null;
  skill_level?: number | null;
  options?: CreateQuestionOptionPayload[];
}

// ── Bulk upload ───────────────────────────────────────────────────────────────
export interface BulkUploadError {
  row: number;
  field: string;
  message: string;
}

export interface BulkUploadResult {
  imported: number;
  errors: BulkUploadError[];
}

// ── Filters ───────────────────────────────────────────────────────────────────
export interface QuestionBankFilters {
  skill?: number;
  skill_level?: number;
  question_type?: StandaloneQuestionType;
  is_active?: boolean;
  search?: string;
  page?: number;
}
