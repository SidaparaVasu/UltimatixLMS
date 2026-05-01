// ── Status / enum types ────────────────────────────────────────────────────

export type TrainingPlanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED';

export type TrainingPlanPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type TrainingApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type TrainingSessionType = 'ONLINE' | 'OFFLINE' | 'HYBRID' | 'SELF_PACED';

export type EnrollmentStatus = 'ENROLLED' | 'WAITLIST' | 'CANCELLED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'PARTIAL';

// ── Core model interfaces ──────────────────────────────────────────────────

export interface TrainingPlan {
  id: number;
  plan_name: string;
  year: number;
  department: number;
  department_name: string;
  created_by: number;
  created_by_name: string;
  status: TrainingPlanStatus;
  items_count?: number;
  // extended fields
  training_category: string;
  training_provider: string;
  training_scope: string;
  skills: number[];
  skill_names?: string[];
  budget_per_employee: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_hours: string | null;
  // computed: most recent rejection info (present when status=DRAFT and was previously rejected)
  last_rejection?: {
    comments: string;
    approver_name: string | null;
    rejected_at: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlanItem {
  id: number;
  training_plan: number;
  plan_name?: string;
  course: number | null;
  course_title?: string;
  target_department: number;
  target_department_name: string;
  planned_participants: number;
  priority: TrainingPlanPriority;
  created_at: string;
}

export interface TrainingPlanApproval {
  id: number;
  training_plan: number;
  training_plan_name?: string;
  training_plan_year?: number;
  training_plan_department?: string;
  approver: number;
  approver_name: string;
  submitted_by?: number;
  submitted_by_name?: string;
  approval_status: TrainingApprovalStatus;
  comments: string;
  approved_at: string | null;
  created_at: string;
}

export interface TrainingCalendar {
  id: number;
  year: number;
  department: number;
  department_name: string;
  training_plan: number | null;
  created_by: number;
  created_at: string;
}

export interface TrainingSession {
  id: number;
  course: number | null;
  course_title?: string;
  calendar: number;
  training_plan_item: number | null;
  training_plan_item_name?: string;
  session_title: string;
  session_type: TrainingSessionType;
  session_start_date: string; // ISO datetime
  session_end_date: string;   // ISO datetime
  location: string;
  meeting_link: string;
  capacity: number;
  current_enrollments: number; // computed by serializer
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionTrainer {
  id: number;
  training_session: number;
  trainer: number;
  trainer_name: string;
  assigned_at: string;
}

export interface TrainingSessionEnrollment {
  id: number;
  training_session: number;
  session_title?: string;
  employee: number;
  employee_name: string;
  employee_code: string;
  enrollment_status: EnrollmentStatus;
  enrolled_at: string;
}

export interface TrainingAttendance {
  id: number;
  training_session: number;
  employee: number;
  employee_name: string;
  employee_code?: string;
  attendance_status: AttendanceStatus;
  recorded_at: string;
}

// ── API list param types ───────────────────────────────────────────────────

export interface TrainingPlanListParams {
  year?: number;
  department?: number;
  status?: TrainingPlanStatus | '';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TrainingPlanItemListParams {
  training_plan?: number;
  page?: number;
  page_size?: number;
}

export interface TrainingApprovalListParams {
  approval_status?: TrainingApprovalStatus | '';
  training_plan?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TrainingCalendarListParams {
  year?: number;
  department?: number;
}

export interface TrainingSessionListParams {
  calendar?: number;
  session_type?: TrainingSessionType;
  start_date_after?: string;
  start_date_before?: string;
  page?: number;
  page_size?: number;
}

// ── Form payload types ─────────────────────────────────────────────────────

export interface CreateTrainingPlanPayload {
  plan_name: string;
  year: number;
  department: number;
  training_category?: string;
  training_provider?: string;
  training_scope?: string;
  skills?: number[];
  budget_per_employee?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_hours?: string | null;
}

export interface UpdateTrainingPlanPayload extends Partial<CreateTrainingPlanPayload> {
  status?: TrainingPlanStatus;
}

export interface CreateTrainingPlanItemPayload {
  training_plan: number;
  course?: number | null;
  target_department: number;
  planned_participants: number;
  priority: TrainingPlanPriority;
}

export interface CreateTrainingCalendarPayload {
  year: number;
  department: number;
  training_plan?: number | null;
}

export interface CreateTrainingSessionPayload {
  course?: number | null;
  calendar: number;
  training_plan_item?: number | null;
  session_title: string;
  session_type: TrainingSessionType;
  session_start_date: string;
  session_end_date: string;
  location?: string;
  meeting_link?: string;
  capacity: number;
}

export interface UpdateTrainingSessionPayload extends Partial<CreateTrainingSessionPayload> {}

export interface CreateSessionTrainerPayload {
  training_session: number;
  trainer: number;
}

export interface CreateEnrollmentPayload {
  training_session: number;
  employee: number;
}

export interface UpsertAttendancePayload {
  training_session: number;
  records: Array<{
    employee: number;
    attendance_status: AttendanceStatus;
  }>;
}

export interface FinalizeApprovalPayload {
  status: TrainingApprovalStatus;
  comments: string;
}
