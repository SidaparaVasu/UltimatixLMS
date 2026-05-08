import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  SkillUpgradeProposal,
  SkillUpgradeFilters,
} from '@/types/skill-upgrade.types';

const BASE = '/assessment/skill-upgrade-proposals';

export const skillUpgradeApi = {
  /**
   * GET /assessment/skill-upgrade-proposals/
   * Returns skill upgrade proposals. Defaults to PENDING only.
   * Pass status: 'APPROVED' or omit for all.
   */
  list: async (filters?: SkillUpgradeFilters) => {
    try {
      const response = await apiClient.get(`${BASE}/`, { params: filters });
      return handleApiResponse<PaginatedResponse<SkillUpgradeProposal>>(
        response.data,
        false,
      );
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/skill-upgrade-proposals/:id/approve/
   * Approves a pending skill upgrade proposal.
   * Updates EmployeeSkill if the proposed level is higher than current.
   */
  approve: async (id: number) => {
    try {
      const response = await apiClient.post(`${BASE}/${id}/approve/`);
      return handleApiResponse<SkillUpgradeProposal>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
