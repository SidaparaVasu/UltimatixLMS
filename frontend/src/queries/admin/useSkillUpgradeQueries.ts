import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { skillUpgradeApi } from '@/api/skill-upgrade-api';
import { SkillUpgradeFilters } from '@/types/skill-upgrade.types';

export const SKILL_UPGRADE_KEYS = {
  all:  () => ['skill-upgrade-proposals'] as const,
  list: (filters?: SkillUpgradeFilters) => ['skill-upgrade-proposals', 'list', filters] as const,
};

/**
 * Fetches skill upgrade proposals. Defaults to PENDING only (backend default).
 * Pass { status: 'APPROVED' } or omit status to get all.
 */
export const useSkillUpgradeProposalList = (filters?: SkillUpgradeFilters) =>
  useQuery({
    queryKey: SKILL_UPGRADE_KEYS.list(filters),
    queryFn:  () => skillUpgradeApi.list(filters),
    staleTime: 30_000,
  });

/**
 * Approves a skill upgrade proposal.
 * Invalidates the proposals list on success so the table refreshes.
 */
export const useApproveSkillUpgrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => skillUpgradeApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SKILL_UPGRADE_KEYS.all() });
    },
  });
};
