import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import type {
  EmployeeSummary,
  ManagerTeamStats,
  AdminPortalStats,
  ActivityChartData,
  ActivityChartFilter,
  RecentEnrollment,
  HrOverview,
  ScopedEmployee,
  PendingApprovals,
  SkillMatrixRow,
  TrainingSession,
} from "@/types/dashboard.types";

/**
 * Dashboard API — aggregated statistics for Employee, Manager, and Admin dashboards.
 * Base path: /api/v1/dashboard/
 */
export const dashboardApi = {
  // -------------------------------------------------------------------------
  // Employee
  // -------------------------------------------------------------------------

  /** GET /api/v1/learning/my-learning/summary/ */
  getEnrollmentSummary: async () => {
    try {
      const response = await apiClient.get("/learning/my-learning/summary/");
      return handleApiResponse<EmployeeSummary>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** GET /api/v1/dashboard/hr-stats/ */
  getHrStats: async () => {
    try {
      const response = await apiClient.get("/dashboard/hr-stats/");
      return handleApiResponse<HrOverview>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** GET /api/v1/dashboard/hr-employees/ */
  getHrEmployees: async () => {
    try {
      const response = await apiClient.get("/dashboard/hr-employees/");
      return handleApiResponse<ScopedEmployee[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Manager
  // -------------------------------------------------------------------------

  /** GET /api/v1/dashboard/manager-stats/ */
  getManagerStats: async () => {
    try {
      const response = await apiClient.get("/dashboard/manager-stats/");
      return handleApiResponse<ManagerTeamStats>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** GET /api/v1/dashboard/pending-approvals/ */
  getPendingApprovals: async () => {
    try {
      const response = await apiClient.get("/dashboard/pending-approvals/");
      return handleApiResponse<PendingApprovals>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  /** GET /api/v1/dashboard/admin-stats/ */
  getAdminStats: async () => {
    try {
      const response = await apiClient.get("/dashboard/admin-stats/");
      return handleApiResponse<AdminPortalStats>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** GET /api/v1/dashboard/activity-chart/?filter=daily|weekly|monthly|annual */
  getActivityChart: async (filter: ActivityChartFilter = "daily") => {
    try {
      const response = await apiClient.get("/dashboard/activity-chart/", {
        params: { filter },
      });
      return handleApiResponse<ActivityChartData>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** GET /api/v1/dashboard/recent-enrollments/?limit=10 */
  getRecentEnrollments: async (limit = 10) => {
    try {
      const response = await apiClient.get("/dashboard/recent-enrollments/", {
        params: { limit },
      });
      return handleApiResponse<RecentEnrollment[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // -------------------------------------------------------------------------
  // Employee — Skill Matrix & Training Calendar
  // -------------------------------------------------------------------------

  /** GET /api/v1/skills/my-skill-matrix/ */
  getMySkillMatrix: async () => {
    try {
      const response = await apiClient.get("/skills/my-skill-matrix/");
      return handleApiResponse<SkillMatrixRow[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /api/v1/training/sessions/
   * Fetches sessions within a date range for the calendar panel.
   */
  getTrainingSessions: async (startAfter: string, startBefore: string) => {
    try {
      const response = await apiClient.get("/planning/sessions/", {
        params: { start_date_after: startAfter, start_date_before: startBefore },
      });
      return handleApiResponse<TrainingSession[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
