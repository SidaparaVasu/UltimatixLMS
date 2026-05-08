// ── Player phases ─────────────────────────────────────────────────────────────
export type PlayerPhase = 'instructions' | 'active' | 'result';

// ── Reason the assessment was submitted ───────────────────────────────────────
export type SubmissionReason = 'normal' | 'timeout' | 'violation';

// ── System check state (instructions phase) ───────────────────────────────────
export interface SystemCheckState {
  internet: boolean;
  camera: boolean;
  microphone: boolean;
}

// ── Sanitized question option (no is_correct exposed to learner) ──────────────
export interface PlayerQuestionOption {
  id: number;
  option_text: string;
  display_order: number;
}

// ── Sanitized question (no correct answers exposed) ───────────────────────────
export interface PlayerQuestion {
  id: string;           // UUID
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'DESCRIPTIVE' | 'SCENARIO';
  scenario_text: string;
  options: PlayerQuestionOption[];
}

// ── Response from GET /assessment/attempts/:id/next-question/ ─────────────────
export interface NextQuestionResponse {
  question: PlayerQuestion;
  status: string;
  started_at: string;
  time_limit_seconds: number;   // 0 = no per-question limit
  question_number: number;      // 1-based
  total_questions: number;
}

// ── Response from GET /assessment/attempts/:id/resume/ ───────────────────────
export interface ResumeAttemptResponse {
  attempt_id: string;
  status: string;
  remaining_seconds: number;
  next_question: NextQuestionResponse | null;
  finalized: boolean;
}

// ── Payload for POST /assessment/attempts/:id/submit-question/ ───────────────
export interface SubmitAnswerPayload {
  question_id: string;
  selected_options: number[];
  answer_text: string;
}

// ── Locally-stored pending answer (used during offline) ──────────────────────
export interface PendingLocalAnswer {
  questionId: string;
  selectedOptions: number[];
  answerText: string;
}
