// ── Review Queue (list) ───────────────────────────────────────────────────────

export interface ReviewQueueItem {
  id: string;                  // attempt UUID
  employee_code: string;
  learner_name: string;
  assessment_title: string;
  course_title: string | null;
  submitted_at: string;
  auto_score: number;
  total_points: number;
  pending_count: number;
}

// ── Review Detail ─────────────────────────────────────────────────────────────

export interface ReviewAnswerOption {
  id: number;
  option_text: string;
}

export interface ReviewAnswer {
  id: number;
  question: string;            // UUID
  question_text: string;
  question_type: string;
  scenario_text: string;
  explanation_text: string;
  status: string;
  answer_text: string;
  uploaded_file: number | null;
  is_auto_graded: boolean;
  earned_points: number;
  max_points: number;
  selected_options: ReviewAnswerOption[];
  correct_options: ReviewAnswerOption[];
}

export interface ReviewResult {
  id: number;
  total_score: number;
  score_percentage: number;
  status: 'PASS' | 'FAIL' | 'PENDING';
  grading_type: string;
  instructor_feedback: string;
  graded_at: string | null;
}

export interface ReviewAttemptDetail {
  id: string;
  employee_code: string;
  learner_name: string;
  assessment: number;
  assessment_title: string;
  course_title: string | null;
  lesson_id: number | null;
  passing_percentage: string;
  submitted_at: string;
  answers: ReviewAnswer[];
  result: ReviewResult | null;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface ManualGradeItem {
  answer_id: number;
  earned_points: number;
}

export interface ManualGradePayload {
  grades: ManualGradeItem[];
  instructor_feedback?: string;
}

export interface RetakeGrantPayload {
  note?: string;
}
