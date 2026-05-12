import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  StandaloneAssessment,
  StandaloneAssessmentListItem,
  AssessmentFormValues,
  SkillMappingRow,
  SkillMappingPayload,
  QuestionMappingItem,
  QuestionMappingPayload,
  ReorderMappingsPayload,
  QuestionAvailability,
} from '@/types/standalone-assessment.types';
import { QuestionBankItem } from '@/types/question-bank.types';

const STUDIO_BASE   = '/assessment/studio';
const MAPPING_BASE  = '/assessment/skill-mappings';
const Q_MAP_BASE    = '/assessment/question-mappings';

export const standaloneAssessmentApi = {
  // ── Assessment CRUD ─────────────────────────────────────────────────────────

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
   * Returns full assessment detail including skill_mappings and mapped_question_count.
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
   * question_selection_mode is passed from the form (DYNAMIC or CURATED).
   */
  create: async (data: AssessmentFormValues) => {
    try {
      const response = await apiClient.post(`${STUDIO_BASE}/`, data);
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
   */
  deleteSkillMapping: async (id: number) => {
    try {
      const response = await apiClient.delete(`${MAPPING_BASE}/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Question Mappings (CURATED mode) ────────────────────────────────────────

  /**
   * GET /assessment/question-mappings/?assessment=:id
   * Returns all questions mapped to a CURATED assessment, ordered by display_order.
   */
  listQuestionMappings: async (assessmentId: number) => {
    try {
      const response = await apiClient.get(`${Q_MAP_BASE}/`, {
        params: { assessment: assessmentId },
      });
      return handleApiResponse<QuestionMappingItem[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/question-mappings/
   * Maps a question to a CURATED assessment.
   */
  addQuestionMapping: async (data: QuestionMappingPayload) => {
    try {
      const response = await apiClient.post(`${Q_MAP_BASE}/`, data);
      return handleApiResponse<QuestionMappingItem>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * DELETE /assessment/question-mappings/:id/
   * Removes a question from a CURATED assessment.
   */
  removeQuestionMapping: async (mappingId: number) => {
    try {
      const response = await apiClient.delete(`${Q_MAP_BASE}/${mappingId}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/question-mappings/reorder/
   * Bulk-updates display_order for a list of mappings.
   */
  reorderQuestionMappings: async (data: ReorderMappingsPayload) => {
    try {
      const response = await apiClient.post(`${Q_MAP_BASE}/reorder/`, data);
      return handleApiResponse<{ updated: number }>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Studio actions ──────────────────────────────────────────────────────────

  /**
   * POST /assessment/studio/:id/suggest-questions/
   * Runs the DynamicQuestionSelector and returns a suggested question list
   * WITHOUT saving anything. Requires skill mappings to exist.
   */
  suggestQuestions: async (assessmentId: number) => {
    try {
      const response = await apiClient.post(`${STUDIO_BASE}/${assessmentId}/suggest-questions/`);
      return handleApiResponse<QuestionBankItem[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/studio/:id/check-availability/
   * Checks whether the question bank has enough questions for this assessment.
   */
  checkAvailability: async (assessmentId: number) => {
    try {
      const response = await apiClient.get(`${STUDIO_BASE}/${assessmentId}/check-availability/`);
      return handleApiResponse<QuestionAvailability>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
