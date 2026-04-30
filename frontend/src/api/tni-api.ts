/**
 * TNI API
 *
 * Covers the full TNI (Training Needs Identification) workflow:
 *   - Skill matrix (composite read-only view)
 *   - Self-rating (save draft, submit)
 *   - Manager rating (save draft, submit + gap analysis)
 *   - Rating history
 *   - Training needs (list, my-needs)
 *   - Training need approvals (finalize)
 *
 * Base paths:
 *   /api/v1/skills/   — skill ratings and matrix
 *   /api/v1/tni/      — training needs and approvals
 */

import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  SkillMatrixRow,
  ManagerReviewRow,
  TeamMemberOption,
  EmployeeSkillRating,
  EmployeeSkillRatingHistory,
  TrainingNeed,
  TrainingNeedApproval,
  ManagerSubmitSummary,
  SelfRatingBulkSavePayload,
  SelfRatingSubmitResult,
  ManagerRatingSubmitPayload,
  ApprovalFinalizePayload,
  SkillRatingListParams,
  SkillRatingHistoryParams,
  TrainingNeedListParams,
} from '@/types/tni.types';

export const tniApi = {
  // -------------------------------------------------------------------------
  // Skill Matrix
  // -------------------------------------------------------------------------

  /**
   * GET /skills/my-skill-matrix/
   * Returns the composite skill matrix for the current user:
   * required level + current level + self-rating + manager-rating + gap.
   */
  getMySkillMatrix: async () => {
    try {
      const response = await apiClient.get('/skills/my-skill-matrix/');
      return handleApiResponse<SkillMatrixRow[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Manager — team helpers
  // -------------------------------------------------------------------------

  /**
   * GET /skills/skill-ratings/team-submitted/
   * Returns ALL direct reports who have submitted a self-rating (reviewed or not).
   */
  getTeamSubmitted: async () => {
    try {
      const response = await apiClient.get('/skills/skill-ratings/team-submitted/');
      return handleApiResponse<TeamMemberOption[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /skills/skill-ratings/manager-review-matrix/?employee_id=X
   * Composite review matrix for a manager reviewing a specific employee.
   * Returns one row per self-rated skill with required level, self-rating
   * (including observations + accomplishments), and manager's existing rating.
   */
  getManagerReviewMatrix: async (employeeId: number) => {
    try {
      const response = await apiClient.get('/skills/skill-ratings/manager-review-matrix/', {
        params: { employee_id: employeeId },
      });
      return handleApiResponse<ManagerReviewRow[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Skill Ratings — list and history
  // -------------------------------------------------------------------------

  /**
   * GET /skills/skill-ratings/
   * List rating rows. Defaults to the current user's own ratings.
   * Pass employee_id to view another employee's ratings (manager/admin).
   */
  getSkillRatings: async (params?: SkillRatingListParams) => {
    try {
      const response = await apiClient.get('/skills/skill-ratings/', { params });
      return handleApiResponse<PaginatedResponse<EmployeeSkillRating>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /skills/skill-ratings/history/
   * Rating history for an employee (defaults to current user).
   */
  getSkillRatingHistory: async (params?: SkillRatingHistoryParams) => {
    try {
      const response = await apiClient.get('/skills/skill-ratings/history/', { params });
      return handleApiResponse<PaginatedResponse<EmployeeSkillRatingHistory>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Self-rating workflow
  // -------------------------------------------------------------------------

  /**
   * POST /skills/skill-ratings/save-draft/
   * Bulk upsert DRAFT self-ratings for the current user.
   * Safe to call multiple times — each call updates existing drafts.
   */
  saveSelfRatingDraft: async (payload: SelfRatingBulkSavePayload, notify = false) => {
    try {
      const response = await apiClient.post('/skills/skill-ratings/save-draft/', payload);
      return handleApiResponse<EmployeeSkillRating[]>(response.data, notify);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /skills/skill-ratings/submit/
   * Bulk submit all DRAFT self-ratings for the current user.
   * If the employee has no direct reporting manager, gap analysis runs
   * automatically and bypassed_manager_review will be true in the response.
   */
  submitSelfRatings: async () => {
    try {
      const response = await apiClient.post('/skills/skill-ratings/submit/');
      return handleApiResponse<SelfRatingSubmitResult>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Manager rating workflow
  // -------------------------------------------------------------------------

  /**
   * POST /skills/skill-ratings/manager-save/
   * Bulk upsert DRAFT manager ratings for a given employee.
   * Requires TNI_MANAGE permission.
   */
  saveManagerRatingDraft: async (payload: ManagerRatingSubmitPayload, notify = false) => {
    try {
      const response = await apiClient.post('/skills/skill-ratings/manager-save/', payload);
      return handleApiResponse<EmployeeSkillRating[]>(response.data, notify);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /skills/skill-ratings/manager-submit/
   * Submit manager ratings for an employee.
   * This is the key action that:
   *   1. Pushes identified levels into EmployeeSkill
   *   2. Runs gap analysis and auto-creates TrainingNeed records
   * Returns a summary of gaps found and training needs created.
   */
  submitManagerRatings: async (payload: ManagerRatingSubmitPayload) => {
    try {
      const response = await apiClient.post('/skills/skill-ratings/manager-submit/', payload);
      return handleApiResponse<ManagerSubmitSummary>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Training Needs
  // -------------------------------------------------------------------------

  /**
   * GET /tni/tni-needs/
   * List all training needs (admin/manager view).
   * Filterable by status, priority, source_type, employee_id, department_id.
   */
  getTrainingNeeds: async (params?: TrainingNeedListParams) => {
    try {
      const response = await apiClient.get('/tni/tni-needs/', { params });
      return handleApiResponse<PaginatedResponse<TrainingNeed>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /tni/tni-needs/my-needs/
   * Returns training needs for the currently authenticated employee.
   * Supports optional status filter.
   */
  getMyTrainingNeeds: async (params?: { status?: string }) => {
    try {
      const response = await apiClient.get('/tni/tni-needs/my-needs/', { params });
      return handleApiResponse<PaginatedResponse<TrainingNeed>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Training Need Approvals
  // -------------------------------------------------------------------------

  /**
   * POST /tni/tni-needs/{id}/approve/
   * Approve a training need directly. Updates status → APPROVED.
   */
  approveTrainingNeed: async (needId: number, comments?: string) => {
    try {
      const response = await apiClient.post(`/tni/tni-needs/${needId}/approve/`, { comments: comments ?? '' });
      return handleApiResponse<TrainingNeed>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /tni/tni-needs/{id}/reject/
   * Reject a training need. Comments are required.
   */
  rejectTrainingNeed: async (needId: number, comments: string) => {
    try {
      const response = await apiClient.post(`/tni/tni-needs/${needId}/reject/`, { comments });
      return handleApiResponse<TrainingNeed>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * @deprecated Use approveTrainingNeed / rejectTrainingNeed instead.
   * POST /tni/approvals/{id}/finalize/
   */
  finalizeApproval: async (approvalId: number, payload: ApprovalFinalizePayload) => {
    try {
      const response = await apiClient.post(`/tni/approvals/${approvalId}/finalize/`, payload);
      return handleApiResponse<TrainingNeedApproval>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
