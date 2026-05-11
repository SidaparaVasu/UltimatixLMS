import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  CatalogItem,
  StartAttemptPayload,
  StartAttemptResult,
} from '@/types/assessment-catalog.types';

export const assessmentCatalogApi = {
  /**
   * GET /assessment/catalog/
   * Returns all published standalone assessments with learner-specific
   * attempt history, cooldown status, and skill mappings.
   */
  list: async () => {
    try {
      const response = await apiClient.get('/assessment/catalog/');
      return handleApiResponse<PaginatedResponse<CatalogItem>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/attempts/start/
   * Initialises a new attempt for the given assessment.
   * Returns the created attempt including its UUID and expires_at.
   */
  startAttempt: async (payload: StartAttemptPayload) => {
    try {
      const response = await apiClient.post('/assessment/attempts/start/', payload);
      return handleApiResponse<StartAttemptResult>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/catalog/:id/
   * Returns a single catalog item for the given assessment ID.
   * Used by the assessment player to load metadata (title, duration, etc.)
   * for the instructions screen without coupling to the admin studio API.
   */
  getDetail: async (assessmentId: number) => {
    try {
      const response = await apiClient.get(`/assessment/catalog/${assessmentId}/`);
      return handleApiResponse<CatalogItem>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
