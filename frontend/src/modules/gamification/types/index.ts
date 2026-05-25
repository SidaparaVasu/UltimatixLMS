/**
 * Gamification API types (health/status only).
 */

export interface GamificationHealthResponse {
  status: string;
  module: string;
  phase: number;
  global_feature_enabled: boolean;
  company_enabled: boolean;
  active: boolean;
}
