import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { gamificationApi } from '../api/gamification-api';
import type { LeaderboardParams, TransactionListParams } from '../types';
import { GAMIFICATION_QUERY_KEYS } from './query-keys';
import { useGamificationEnabled } from './useGamificationEnabled';

function useGamificationQueryEnabled() {
  const { isAuthenticated } = useAuthStore();
  const { isEnabled, isLoading: statusLoading } = useGamificationEnabled();
  return {
    enabled: isAuthenticated && isEnabled,
    statusLoading,
  };
}

export function useGamificationSummary() {
  const { enabled, statusLoading } = useGamificationQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.summary,
    queryFn: () => gamificationApi.getMySummary(),
    enabled,
    staleTime: 30_000,
  });
}

export function useGamificationTransactions(params?: TransactionListParams) {
  const { enabled } = useGamificationQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.transactions(params),
    queryFn: () => gamificationApi.getMyTransactions(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useGamificationLeaderboard(params?: LeaderboardParams) {
  const { enabled } = useGamificationQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.leaderboard(params),
    queryFn: () => gamificationApi.getLeaderboard(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useGamificationBadgeCatalog() {
  const { enabled } = useGamificationQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.badgeCatalog,
    queryFn: () => gamificationApi.getBadgeCatalog(),
    enabled,
    staleTime: 60_000,
  });
}

export function useGamificationMyBadges() {
  const { enabled } = useGamificationQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.myBadges,
    queryFn: () => gamificationApi.getMyBadges(),
    enabled,
    staleTime: 60_000,
  });
}

export { useGamificationQueryEnabled };
