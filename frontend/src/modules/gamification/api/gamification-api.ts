/**
 * Gamification API client.
 * Base path: /api/v1/gamification/
 */

import { apiClient } from '@/api/axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { GAMIFICATION_API_BASE } from '../constants';
import type {
  AwardRule,
  AwardRuleUpdatePayload,
  Badge,
  BadgeCatalogResponse,
  CompanyGamificationConfig,
  CompanyGamificationConfigUpdatePayload,
  PendingCelebrationsResponse,
  GamificationSnapshotPayload,
  GamificationHealthResponse,
  GamificationPaginated,
  GamificationSummary,
  LeaderboardParams,
  LeaderboardResponse,
  PointTransaction,
  TeamGamificationDetail,
  TeamGamificationMember,
  TeamListParams,
  TransactionListParams,
} from '../types';

export const gamificationApi = {
  getHealth: async (): Promise<GamificationHealthResponse> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/health/`);
      return handleApiResponse<GamificationHealthResponse>(response.data, false) as GamificationHealthResponse;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getPendingCelebrations: async (): Promise<PendingCelebrationsResponse> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/me/pending-celebrations/`);
      return handleApiResponse<PendingCelebrationsResponse>(response.data, false) as PendingCelebrationsResponse;
    } catch (error) {
      return handleApiError(error);
    }
  },

  acknowledgeCelebrations: async (
    snapshot?: GamificationSnapshotPayload,
  ): Promise<PendingCelebrationsResponse> => {
    try {
      const response = await apiClient.post(
        `${GAMIFICATION_API_BASE}/me/pending-celebrations/ack/`,
        snapshot ? { snapshot } : undefined,
      );
      return handleApiResponse<PendingCelebrationsResponse>(response.data, false) as PendingCelebrationsResponse;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMySummary: async (): Promise<GamificationSummary> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/me/summary/`);
      return handleApiResponse<GamificationSummary>(response.data, false) as GamificationSummary;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMyTransactions: async (
    params?: TransactionListParams,
  ): Promise<GamificationPaginated<PointTransaction>> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/me/transactions/`, {
        params,
      });
      return handleApiResponse<GamificationPaginated<PointTransaction>>(response.data, false) as GamificationPaginated<PointTransaction>;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getLeaderboard: async (params?: LeaderboardParams): Promise<LeaderboardResponse> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/leaderboard/`, {
        params,
      });
      return handleApiResponse<LeaderboardResponse>(response.data, false) as LeaderboardResponse;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getBadgeCatalog: async (): Promise<BadgeCatalogResponse> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/badges/catalog/`);
      return handleApiResponse<BadgeCatalogResponse>(response.data, false) as BadgeCatalogResponse;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMyBadges: async (): Promise<Badge[]> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/me/badges/`);
      return handleApiResponse<Badge[]>(response.data, false) as Badge[];
    } catch (error) {
      return handleApiError(error);
    }
  },

  getTeamList: async (
    params?: TeamListParams,
  ): Promise<GamificationPaginated<TeamGamificationMember>> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/team/`, { params });
      return handleApiResponse<GamificationPaginated<TeamGamificationMember>>(
        response.data,
        false,
      ) as GamificationPaginated<TeamGamificationMember>;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getTeamMember: async (employeeId: number): Promise<TeamGamificationDetail> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/team/${employeeId}/`);
      return handleApiResponse<TeamGamificationDetail>(response.data, false) as TeamGamificationDetail;
    } catch (error) {
      return handleApiError(error);
    }
  },

  getCompanyConfig: async (): Promise<CompanyGamificationConfig> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/config/`);
      return handleApiResponse<CompanyGamificationConfig>(response.data, false) as CompanyGamificationConfig;
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateCompanyConfig: async (
    payload: CompanyGamificationConfigUpdatePayload,
  ): Promise<CompanyGamificationConfig> => {
    try {
      const response = await apiClient.patch(`${GAMIFICATION_API_BASE}/config/`, payload);
      return handleApiResponse<CompanyGamificationConfig>(response.data) as CompanyGamificationConfig;
    } catch (error) {
      return handleApiError(error);
    }
  },

  listAwardRules: async (): Promise<AwardRule[]> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/rules/`);
      return handleApiResponse<AwardRule[]>(response.data, false) as AwardRule[];
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateAwardRule: async (
    ruleId: number,
    payload: AwardRuleUpdatePayload,
  ): Promise<AwardRule> => {
    try {
      const response = await apiClient.patch(`${GAMIFICATION_API_BASE}/rules/${ruleId}/`, payload);
      return handleApiResponse<AwardRule>(response.data) as AwardRule;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
