import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  StandaloneAssessment,
  StandaloneAssessmentListItem,
  AssessmentFormValues,
  SkillMappingRow,
  SkillMappingPayload,
} from '@/types/standalone-assessment.types';

const STUDIO_BASE  = '/assessment/studio';
const MAPPING_BASE = '/assessment/skill-mappings';

export const standaloneAssessmentApi = {
  /**
   * GET /assessment/studio/?standalone=true
   * Returns paginated list of standalone assessments.
   */
  list: async (params?: { page?: number; page_size?: number }) => {
    try {
      const response = await apiClient.get(`${STUDIO_BASE}/`, {
        params: { standalone: 'true', ...params },
      });
      return handleApiResponse<PaginatedResponse<StandaloneAssessmentListItem>>(
        response.data,
        false,
      );
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/studio/:id/
   * Returns full assessment detail including skill_mappings.
   */
  detail: async (id: number) => {
    try {
      const response = await apiClient.get(`${STUDIO_BASE}/${id}/`);
      return handleApiResponse<StandaloneAssessment>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/studio/
   * Creates a new standalone assessment.
   * question_selection_mode is always DYNAMIC for standalone.
   */
  create: async (data: AssessmentFormValues) => {
    try {
      const response = await apiClient.post(`${STUDIO_BASE}/`, {
        ...data,
        question_selection_mode: 'DYNAMIC',
      });
      return handleApiResponse<StandaloneAssessment>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * PATCH /assessment/studio/:id/
   * Updates an existing assessment (partial update).
   */
  update: async (id: number, data: Partial<AssessmentFormValues>) => {
    try {
      const response = await apiClient.patch(`${STUDIO_BASE}/${id}/`, data);
      return handleApiResponse<StandaloneAssessment>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Skill Mappings ──────────────────────────────────────────────────────────

  /**
   * GET /assessment/skill-mappings/?assessment=:id
   * Returns all skill mappings for a given assessment.
   */
  listSkillMappings: async (assessmentId: number) => {
    try {
      const response = await apiClient.get(`${MAPPING_BASE}/`, {
        params: { assessment: assessmentId },
      });
      return handleApiResponse<SkillMappingRow[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/skill-mappings/
   * Adds a skill mapping to an assessment.
   */
  addSkillMapping: async (data: SkillMappingPayload) => {
    try {
      const response = await apiClient.post(`${MAPPING_BASE}/`, data);
      return handleApiResponse<SkillMappingRow>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * DELETE /assessment/skill-mappings/:id/
   * Removes a skill mapping.
   */
  deleteSkillMapping: async (id: number) => {
    try {
      const response = await apiClient.delete(`${MAPPING_BASE}/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
