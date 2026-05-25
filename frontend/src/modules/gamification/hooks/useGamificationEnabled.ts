import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../api/gamification-api';

export const GAMIFICATION_STATUS_QUERY_KEY = ['gamification', 'health'] as const;

/**
 * True when global feature flag and company config are both enabled.
 * While loading or on error, returns false (module hidden).
 */
export function useGamificationEnabled() {
  const query = useQuery({
    queryKey: GAMIFICATION_STATUS_QUERY_KEY,
    queryFn: () => gamificationApi.getHealth(),
    staleTime: 60_000,
    retry: 1,
  });

  return {
    isLoading: query.isLoading,
    isEnabled: query.data?.active === true,
    status: query.data,
    refetch: query.refetch,
  };
}
