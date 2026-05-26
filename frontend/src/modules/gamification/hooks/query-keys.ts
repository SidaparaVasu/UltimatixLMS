import type { LeaderboardParams, TeamListParams, TransactionListParams } from '../types';

export const GAMIFICATION_QUERY_KEYS = {
  health: ['gamification', 'health'] as const,
  summary: ['gamification', 'me', 'summary'] as const,
  transactions: (params?: TransactionListParams) =>
    ['gamification', 'me', 'transactions', params] as const,
  leaderboard: (params?: LeaderboardParams) =>
    ['gamification', 'leaderboard', params] as const,
  badgeCatalog: ['gamification', 'badges', 'catalog'] as const,
  myBadges: ['gamification', 'me', 'badges'] as const,
  team: (params?: TeamListParams) => ['gamification', 'team', params] as const,
  teamMember: (employeeId: number) => ['gamification', 'team', employeeId] as const,
  adminConfig: ['gamification', 'admin', 'config'] as const,
  adminRules: ['gamification', 'admin', 'rules'] as const,
};
