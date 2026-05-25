/**
 * Gamification API types (aligned with backend serializers).
 */

export interface GamificationHealthResponse {
  status: string;
  module: string;
  phase: number;
  global_feature_enabled: boolean;
  company_enabled: boolean;
  active: boolean;
}

export interface StreakSnapshot {
  current: number;
  longest: number;
}

export interface Streaks {
  learning: StreakSnapshot;
  pass_daily: StreakSnapshot;
  attempt_daily: StreakSnapshot;
  pass_consecutive: StreakSnapshot;
}

export interface PointTransaction {
  id: number;
  amount: number;
  rule_code: string;
  rule_label: string;
  source_type: string;
  source_id: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface GamificationSummary {
  lifetime_xp: number;
  rank: number;
  pool_size: number;
  badges_count: number;
  streaks: Streaks;
  recent_transactions: PointTransaction[];
}

export interface LeaderboardEntry {
  rank: number;
  employee_id: number;
  employee_code: string;
  display_name: string;
  department_name: string;
  business_unit_name: string;
  designation_name: string;
  period_xp: number;
  badges_count: number;
}

export interface LeaderboardMyRank {
  rank: number | null;
  period_xp: number;
  pool_size: number;
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export interface LeaderboardParams {
  period?: LeaderboardPeriod;
  department_id?: number;
  business_unit_id?: number;
  designation_id?: number;
  page?: number;
  page_size?: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  department_id: number | null;
  business_unit_id: number | null;
  designation_id: number | null;
  my_rank: LeaderboardMyRank;
  count: number;
  next: string | null;
  previous: string | null;
  results: LeaderboardEntry[];
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  category: string;
  criteria_type: string;
  icon_key: string;
  sort_order: number;
  is_earned: boolean;
  earned_at?: string;
}

export interface BadgeCatalogResponse {
  count: number;
  results: Badge[];
}

export interface GamificationPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TransactionListParams {
  page?: number;
  page_size?: number;
}
