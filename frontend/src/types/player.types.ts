/**
 * Types specific to the Course Player.
 * Extends existing courses.types.ts — do not duplicate shared types.
 */

// ─── Progress Status ────────────────────────────────────────────────────────

export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// ─── Content Progress (per asset) ───────────────────────────────────────────

export interface ContentProgress {
  content: number;           // content id
  playhead_seconds: number;
  is_completed: boolean;
  last_accessed_at: string;
}

// ─── Lesson Progress (per lesson) ───────────────────────────────────────────

export interface LessonProgress {
  lesson: number;            // lesson id
  status: LessonProgressStatus;
  completed_at: string | null;
  content_progress: ContentProgress[];
}

// ─── Detailed Enrollment ────────────────────────────────────────────────────

export interface DetailedEnrollmentProgress {
  id: number;
  course: number;
  course_title: string;
  course_code: string;
  category_name: string;
  enrollment_type: string;
  status: string;
  progress_percentage: string;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  lesson_progress: LessonProgress[];
}

// ─── Heartbeat Payload ───────────────────────────────────────────────────────

export interface HeartbeatPayload {
  enrollment_id: number;
  lesson_id: number;
  content_id: number;
  playhead_seconds: number;
  signal_completion?: boolean;
}

// ─── Assessment / Quiz Types ─────────────────────────────────────────────────

export interface QuestionOption {
  id: number;
  option_text: string;
  display_order: number;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'DESCRIPTIVE' | 'SCENARIO' | 'FILE_UPLOAD';

export interface QuizQuestion {
  id: string;                // UUID
  question_text: string;
  question_type: QuestionType;
  scenario_text: string;
  options: QuestionOption[];
}

export interface UserAnswerLifecycle {
  question: QuizQuestion;
  status: 'NOT_VISITED' | 'ATTEMPTED' | 'TIMED_OUT';
  started_at: string | null;
  time_limit_seconds: number;
  question_number: number;
  total_questions: number;
}

export interface AssessmentAttempt {
  id: string;                // UUID
  assessment: number;
  employee: number;
  started_at: string;
  expires_at: string;
  status: string;
}

export interface AssessmentInfo {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  passing_percentage: string;
  retake_limit: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  // Learner endpoint additions
  question_count: number;
  attempts_used: number;
  attempts_remaining: number;
}

export interface AttemptResult {
  id: number;
  attempt: string;
  total_score: string;
  score_percentage: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  grading_type: string;
  instructor_feedback: string;
  graded_at: string | null;
  // Enriched stats
  total_questions: number;
  attempted_count: number;
  correct_count: number;
}

// ─── Player UI State (used in Zustand store) ─────────────────────────────────

export interface PlayerUIState {
  activeLessonId: number | null;
  activeContentIndex: number;
  isSidebarOpen: boolean;
  completedLessonOverlay: number | null;  // lesson id to show overlay for
}
