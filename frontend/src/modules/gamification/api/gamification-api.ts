/**
 * Gamification API — health / status.
 * Base path: /api/v1/gamification/
 */

import { apiClient } from '@/api/axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { GAMIFICATION_API_BASE } from '../constants';
import type { GamificationHealthResponse } from '../types';

export const gamificationApi = {
  getHealth: async (): Promise<GamificationHealthResponse> => {
    try {
      const response = await apiClient.get(`${GAMIFICATION_API_BASE}/health/`);
      return handleApiResponse<GamificationHealthResponse>(response, { notify: false });
    } catch (error) {
      return handleApiError(error);
    }
  },
};
