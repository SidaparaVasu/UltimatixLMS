import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/api/token-storage';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/authStore';
import { gamificationApi } from '../api/gamification-api';
import type { AwardRuleUpdatePayload, CompanyGamificationConfigUpdatePayload } from '../types';
import { GAMIFICATION_QUERY_KEYS } from './query-keys';
import { useGamificationEnabled } from './useGamificationEnabled';

function useGamificationAdminEnabled() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasToken = !!getAccessToken();
  const canManage = usePermission(PERMISSIONS.GAMIFICATION_MANAGE_CONFIG);
  const { status, isLoading: healthLoading } = useGamificationEnabled();

  return {
    enabled: isAuthenticated && hasToken && canManage && status?.global_feature_enabled === true,
    healthLoading,
    globalEnabled: status?.global_feature_enabled === true,
    companyEnabled: status?.company_enabled === true,
  };
}

export function useGamificationCompanyConfig() {
  const { enabled, healthLoading } = useGamificationAdminEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.adminConfig,
    queryFn: () => gamificationApi.getCompanyConfig(),
    enabled,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
    meta: { healthLoading },
  });
}

export function useGamificationAwardRules() {
  const { enabled } = useGamificationAdminEnabled();

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.adminRules,
    queryFn: () => gamificationApi.listAwardRules(),
    enabled,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateGamificationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CompanyGamificationConfigUpdatePayload) =>
      gamificationApi.updateCompanyConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEYS.adminConfig });
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEYS.health });
    },
  });
}

export function useUpdateAwardRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: number; payload: AwardRuleUpdatePayload }) =>
      gamificationApi.updateAwardRule(ruleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEYS.adminRules });
    },
  });
}

export { useGamificationAdminEnabled };
