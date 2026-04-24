import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import type {
  EmployeeSummary,
  ManagerTeamStats,
  AdminPortalStats,
  ActivityChartData,
  ActivityChartFilter,
  RecentEnrollment,
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
};
