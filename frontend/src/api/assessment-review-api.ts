import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  ReviewQueueItem,
  ReviewAttemptDetail,
  ManualGradePayload,
  RetakeGrantPayload,
} from '@/types/assessment-review.types';

const BASE = '/assessment/review';

export const assessmentReviewApi = {
  /**
   * GET /assessment/review/
   * Returns attempts pending manual review.
   */
  getQueue: async (params?: { assessment?: number; course?: number; standalone?: 'true' | 'false'; page?: number; page_size?: number }) => {
    try {
      const response = await apiClient.get(`${BASE}/`, { params });
      return handleApiResponse<PaginatedResponse<ReviewQueueItem>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/review/:attemptId/
   * Full attempt detail for the grading page.
   */
  getDetail: async (attemptId: string) => {
    try {
      const response = await apiClient.get(`${BASE}/${attemptId}/`);
      return handleApiResponse<ReviewAttemptDetail>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/review/:attemptId/submit/
   * Submit manual grades and finalize the result.
   */
  submitGrades: async (attemptId: string, payload: ManualGradePayload) => {
    try {
      const response = await apiClient.post(`${BASE}/${attemptId}/submit/`, payload);
      return handleApiResponse<{ status: string; score_percentage: number; total_score: number; grading_type: string }>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/review/:attemptId/grant-retake/
   * Grant one additional attempt to the learner.
   */
  grantRetake: async (attemptId: string, payload?: RetakeGrantPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/${attemptId}/grant-retake/`, payload ?? {});
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
