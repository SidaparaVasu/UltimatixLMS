import { useQuery } from '@tanstack/react-query';
import { skillHistoryApi } from '@/api/skill-history-api';

export const MY_SKILL_HISTORY_KEYS = {
  all:      ['my-skill-history'] as const,
  forSkill: (skillId: number | undefined) => ['my-skill-history', skillId] as const,
};

/**
 * Learner hook — own skill history, optionally filtered to a single skill.
 * Used by the SkillHistoryDrawer on the My Skills page.
 */
export function useMySkillHistory(skillId?: number) {
  return useQuery({
    queryKey: MY_SKILL_HISTORY_KEYS.forSkill(skillId),
    queryFn:  () => skillHistoryApi.listMine(skillId),
    staleTime: 30_000,
  });
}
