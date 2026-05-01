import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  TrainingPlan,
  TrainingPlanItem,
  TrainingPlanApproval,
  TrainingCalendar,
  TrainingSession,
  TrainingSessionTrainer,
  TrainingSessionEnrollment,
  TrainingAttendance,
  TrainingPlanListParams,
  TrainingPlanItemListParams,
  TrainingApprovalListParams,
  TrainingCalendarListParams,
  TrainingSessionListParams,
  CreateTrainingPlanPayload,
  UpdateTrainingPlanPayload,
  CreateTrainingPlanItemPayload,
  CreateTrainingCalendarPayload,
  CreateTrainingSessionPayload,
  UpdateTrainingSessionPayload,
  CreateSessionTrainerPayload,
  CreateEnrollmentPayload,
  UpsertAttendancePayload,
  FinalizeApprovalPayload,
} from '@/types/training.types';

const BASE = '/planning';

export const trainingApi = {

  // ── Plans ─────────────────────────────────────────────────────────────────

  getPlans: async (params?: TrainingPlanListParams) => {
    try {
      const response = await apiClient.get(`${BASE}/plans/`, { params });
      return handleApiResponse<PaginatedResponse<TrainingPlan>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getPlan: async (id: number) => {
    try {
      const response = await apiClient.get(`${BASE}/plans/${id}/`);
      return handleApiResponse<TrainingPlan>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createPlan: async (payload: CreateTrainingPlanPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/plans/`, payload);
      return handleApiResponse<TrainingPlan>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updatePlan: async (id: number, payload: UpdateTrainingPlanPayload) => {
    try {
      const response = await apiClient.patch(`${BASE}/plans/${id}/`, payload);
      return handleApiResponse<TrainingPlan>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deletePlan: async (id: number) => {
    try {
      const response = await apiClient.delete(`${BASE}/plans/${id}/`);
      return handleApiResponse<null>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Plan Items ────────────────────────────────────────────────────────────

  getPlanItems: async (params?: TrainingPlanItemListParams) => {
    try {
      const response = await apiClient.get(`${BASE}/plan-items/`, { params });
      return handleApiResponse<PaginatedResponse<TrainingPlanItem>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createPlanItem: async (payload: CreateTrainingPlanItemPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/plan-items/`, payload);
      return handleApiResponse<TrainingPlanItem>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deletePlanItem: async (id: number) => {
    try {
      const response = await apiClient.delete(`${BASE}/plan-items/${id}/`);
      return handleApiResponse<null>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Plan Approvals ────────────────────────────────────────────────────────

  getApprovals: async (params?: TrainingApprovalListParams) => {
    try {
      const response = await apiClient.get(`${BASE}/plan-approvals/`, { params });
      return handleApiResponse<PaginatedResponse<TrainingPlanApproval>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  finalizeApproval: async (id: number, payload: FinalizeApprovalPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/plan-approvals/${id}/finalize/`, payload);
      return handleApiResponse<TrainingPlanApproval>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Finalize by plan ID — resolves the pending approval record automatically
  finalizeApprovalByPlan: async (planId: number, payload: FinalizeApprovalPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/plan-approvals/finalize-by-plan/`, {
        plan_id: planId,
        ...payload,
      });
      return handleApiResponse<TrainingPlanApproval>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Calendars ─────────────────────────────────────────────────────────────

  getCalendars: async (params?: TrainingCalendarListParams) => {
    try {
      const response = await apiClient.get(`${BASE}/calendars/`, { params });
      return handleApiResponse<PaginatedResponse<TrainingCalendar>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createCalendar: async (payload: CreateTrainingCalendarPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/calendars/`, payload);
      return handleApiResponse<TrainingCalendar>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Sessions ──────────────────────────────────────────────────────────────

  getSessions: async (params?: TrainingSessionListParams) => {
    try {
      const response = await apiClient.get(`${BASE}/sessions/`, { params });
      return handleApiResponse<PaginatedResponse<TrainingSession>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createSession: async (payload: CreateTrainingSessionPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/sessions/`, payload);
      return handleApiResponse<TrainingSession>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateSession: async (id: number, payload: UpdateTrainingSessionPayload) => {
    try {
      const response = await apiClient.patch(`${BASE}/sessions/${id}/`, payload);
      return handleApiResponse<TrainingSession>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteSession: async (id: number) => {
    try {
      const response = await apiClient.delete(`${BASE}/sessions/${id}/`);
      return handleApiResponse<null>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Session Trainers ──────────────────────────────────────────────────────

  getSessionTrainers: async (sessionId: number) => {
    try {
      const response = await apiClient.get(`${BASE}/session-trainers/`, {
        params: { training_session: sessionId },
      });
      return handleApiResponse<PaginatedResponse<TrainingSessionTrainer>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createSessionTrainer: async (payload: CreateSessionTrainerPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/session-trainers/`, payload);
      return handleApiResponse<TrainingSessionTrainer>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteSessionTrainer: async (id: number) => {
    try {
      const response = await apiClient.delete(`${BASE}/session-trainers/${id}/`);
      return handleApiResponse<null>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Enrollments ───────────────────────────────────────────────────────────

  getEnrollments: async (sessionId: number) => {
    try {
      const response = await apiClient.get(`${BASE}/enrollments/`, {
        params: { training_session: sessionId },
      });
      return handleApiResponse<PaginatedResponse<TrainingSessionEnrollment>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createEnrollment: async (payload: CreateEnrollmentPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/enrollments/`, payload);
      return handleApiResponse<TrainingSessionEnrollment>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Attendance ────────────────────────────────────────────────────────────

  getAttendance: async (sessionId: number) => {
    try {
      const response = await apiClient.get(`${BASE}/attendance/`, {
        params: { training_session: sessionId },
      });
      return handleApiResponse<PaginatedResponse<TrainingAttendance>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // bulk-upsert is a custom action — not a standard DRF router endpoint
  bulkUpsertAttendance: async (payload: UpsertAttendancePayload) => {
    try {
      const response = await apiClient.post(`${BASE}/attendance/bulk-upsert/`, payload);
      return handleApiResponse<TrainingAttendance[]>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
