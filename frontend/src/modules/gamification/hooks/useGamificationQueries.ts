import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/authStore';
import { gamificationApi } from '../api/gamification-api';
import type { LeaderboardParams, TeamListParams, TransactionListParams } from '../types';
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
    retry: false,
    refetchOnWindowFocus: false,
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
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useGamificationTeamQueryEnabled() {
  const { isAuthenticated } = useAuthStore();
  const { isEnabled, isLoading: statusLoading } = useGamificationEnabled();
  const canViewTeam = usePermission(PERMISSIONS.GAMIFICATION_VIEW_TEAM);

  return {
    enabled: isAuthenticated && isEnabled && canViewTeam,
    statusLoading,
    canViewTeam,
  };
}

export function useGamificationTeamList(params?: TeamListParams) {
  const { enabled } = useGamificationTeamQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.team(params),
    queryFn: () => gamificationApi.getTeamList(params),
    enabled,
    staleTime: 30_000,
  });
}

export function useGamificationTeamMember(employeeId: number | null) {
  const { enabled } = useGamificationTeamQueryEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.teamMember(employeeId ?? 0),
    queryFn: () => gamificationApi.getTeamMember(employeeId!),
    enabled: enabled && employeeId != null,
    staleTime: 30_000,
  });
}

export { useGamificationQueryEnabled };
