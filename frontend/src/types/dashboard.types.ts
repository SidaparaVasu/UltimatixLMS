// ---------------------------------------------------------------------------
// Employee Dashboard
// ---------------------------------------------------------------------------

export interface EmployeeSummary {
  in_progress: number;
  completed: number;
  not_started: number;
  overdue: number;
  certificates_earned: number;
}

// ---------------------------------------------------------------------------
// Manager Dashboard
// ---------------------------------------------------------------------------

export interface TeamMember {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string;
  in_progress_count: number;
  completed_count: number;
  completion_percentage: number;
  overdue_count: number;
  avg_progress: number;
}

export interface ManagerTeamStats {
  team_size: number;
  team_completion_rate: number;
  team_in_progress: number;
  team_overdue: number;
  team_members: TeamMember[];
}

// ---------------------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------------------

export interface AdminPortalStats {
  active_users: number;
  published_courses: number;
  total_enrollments: number;
  completion_rate: number;
  certificates_issued: number;
  pending_approvals: number;
}

export interface ActivityChartDataPoint {
  label: string;
  course_completions: number;
  new_enrollments: number;
  certificates_issued: number;
}

export interface ActivityChartData {
  filter_type: string;
  data: ActivityChartDataPoint[];
}

export interface HrOverview {
  total_employees: number;
  total_enrollments: number;
  completion_rate: number;
  in_progress: number;
  overdue: number;
}

/** Per-employee stats for HR dashboard chart and table (scope-filtered) */
export interface ScopedEmployee {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department: string;
  in_progress_count: number;
  completed_count: number;
  completion_percentage: number;
  overdue_count: number;
  avg_progress: number;
}

export interface RecentEnrollment {
  employee_name: string;
  employee_code: string;
  course_title: string;
  course_code: string;
  enrolled_at: string;
  status: string;
  progress_percentage: number;
}

export type ActivityChartFilter = 'daily' | 'weekly' | 'monthly' | 'annual';

// ---------------------------------------------------------------------------
// Manager — Pending Approvals
// ---------------------------------------------------------------------------

export interface TrainingPlanApprovalItem {
  id: number;
  plan_name: string;
  department: string;
  submitted_by: string | null;
  submitted_at: string;
}

export interface TniReviewPendingItem {
  employee_id: number;
  employee_name: string;
  employee_code: string;
  submitted_at: string | null;
}

export interface PendingApprovals {
  training_plan_approvals: TrainingPlanApprovalItem[];
  tni_reviews_pending: TniReviewPendingItem[];
  total: number;
}

// ---------------------------------------------------------------------------
// Employee — Skill Matrix
// ---------------------------------------------------------------------------

export interface SkillLevel {
  id: number;
  level_name: string;
  level_rank: number;
}

export interface SkillMatrixRow {
  skill_id: number;
  skill_name: string;
  skill_code: string;
  category_id: number | null;
  category_name: string | null;
  required_level: SkillLevel | null;
  current_level: SkillLevel | null;
  identified_by: string | null;
  self_rating: { id: number; rated_level: SkillLevel | null; status: string; submitted_at: string } | null;
  manager_rating: { id: number; rated_level: SkillLevel | null; status: string; submitted_at: string } | null;
  gap_value: number | null;
  gap_severity: 'NONE' | 'MINOR' | 'CRITICAL' | 'NOT_RATED' | null;
}

// ---------------------------------------------------------------------------
// Employee — Training Sessions (Calendar)
// ---------------------------------------------------------------------------

export interface TrainingSession {
  id: number;
  session_title: string;
  session_type: 'ONLINE' | 'CLASSROOM' | 'LIVE' | string;
  session_start_date: string;
  session_end_date: string;
  location: string;
  meeting_link: string;
  course_title: string | null;
  capacity: number;
  current_enrollments: number;
}
