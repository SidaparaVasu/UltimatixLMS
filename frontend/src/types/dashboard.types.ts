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
  logins: number;
  course_completions: number;
}

export interface ActivityChartData {
  filter_type: string;
  data: ActivityChartDataPoint[];
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
