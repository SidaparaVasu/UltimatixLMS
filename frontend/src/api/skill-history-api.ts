import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import { SkillHistoryEntry, SkillHistoryParams } from '@/types/skill-history.types';

export const skillHistoryApi = {
  /**
   * GET /skills/employee-skill-history/
   * Returns paginated skill level change history.
   *
   * Filters:
   *   ?employee_id=<int>    — specific employee (admin use)
   *   ?my=true              — requesting user's own history
   *   ?skill_id=<int>       — filter by skill
   *   ?change_reason=<str>  — filter by reason
   */
  list: async (params?: SkillHistoryParams) => {
    try {
      const response = await apiClient.get('/skills/employee-skill-history/', { params });
      return handleApiResponse<PaginatedResponse<SkillHistoryEntry>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /skills/employee-skill-history/?my=true&skill_id=<id>
   * Convenience wrapper for the learner's own history for a specific skill.
   */
  listMine: async (skillId?: number) => {
    try {
      const params: Record<string, unknown> = { my: true };
      if (skillId) params.skill_id = skillId;
      const response = await apiClient.get('/skills/employee-skill-history/', { params });
      return handleApiResponse<PaginatedResponse<SkillHistoryEntry>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
