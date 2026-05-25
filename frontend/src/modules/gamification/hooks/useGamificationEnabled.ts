import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/api/token-storage';
import { useAuthStore } from '@/stores/authStore';
import { gamificationApi } from '../api/gamification-api';
import { GAMIFICATION_QUERY_KEYS } from './query-keys';

/**
 * True when global feature flag and company config are both enabled.
 * While loading or on error, returns false (module hidden).
 * Does not call the API until the user is authenticated with a valid access token.
 */
export function useGamificationEnabled() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasToken = !!getAccessToken();

  const query = useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.health,
    queryFn: () => gamificationApi.getHealth(),
    enabled: isAuthenticated && hasToken,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading: query.isLoading,
    isEnabled: query.data?.active === true,
    status: query.data,
    refetch: query.refetch,
  };
}
