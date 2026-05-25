import type { LeaderboardParams, TransactionListParams } from '../types';

export const GAMIFICATION_QUERY_KEYS = {
  health: ['gamification', 'health'] as const,
  summary: ['gamification', 'me', 'summary'] as const,
  transactions: (params?: TransactionListParams) =>
    ['gamification', 'me', 'transactions', params] as const,
  leaderboard: (params?: LeaderboardParams) =>
    ['gamification', 'leaderboard', params] as const,
  badgeCatalog: ['gamification', 'badges', 'catalog'] as const,
  myBadges: ['gamification', 'me', 'badges'] as const,
};
