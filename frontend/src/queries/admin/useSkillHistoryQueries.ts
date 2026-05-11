import { useQuery } from '@tanstack/react-query';
import { skillHistoryApi } from '@/api/skill-history-api';
import { SkillHistoryParams } from '@/types/skill-history.types';

export const SKILL_HISTORY_KEYS = {
  all:    ['skill-history'] as const,
  list:   (params: SkillHistoryParams) => ['skill-history', 'list', params] as const,
};

/**
 * Admin hook — paginated, filterable skill history.
 * Scoped to employees visible to the requesting user via their role assignment.
 */
export function useSkillHistoryList(params: SkillHistoryParams = {}) {
  return useQuery({
    queryKey: SKILL_HISTORY_KEYS.list(params),
    queryFn:  () => skillHistoryApi.list(params),
    staleTime: 30_000,
  });
}
