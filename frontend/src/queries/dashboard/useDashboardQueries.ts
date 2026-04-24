import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard-api";
import type { ActivityChartFilter } from "@/types/dashboard.types";

export const DASHBOARD_QUERY_KEYS = {
  enrollmentSummary: ["dashboard", "enrollment-summary"],
  managerStats: ["dashboard", "manager-stats"],
  adminStats: ["dashboard", "admin-stats"],
  activityChart: (filter: ActivityChartFilter) => ["dashboard", "activity-chart", filter],
  recentEnrollments: (limit: number) => ["dashboard", "recent-enrollments", limit],
};

/** Employee dashboard — enrollment counts + certificates */
export const useEnrollmentSummary = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.enrollmentSummary,
    queryFn: dashboardApi.getEnrollmentSummary,
    staleTime: 5 * 60 * 1000, // 5 min
  });

/** Manager dashboard — team stats + member breakdown */
export const useManagerStats = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.managerStats,
    queryFn: dashboardApi.getManagerStats,
    staleTime: 5 * 60 * 1000,
  });

/** Admin dashboard — portal-wide stats */
export const useAdminStats = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.adminStats,
    queryFn: dashboardApi.getAdminStats,
    staleTime: 5 * 60 * 1000,
  });

/** Admin activity chart — refetches when filter changes */
export const useActivityChart = (filter: ActivityChartFilter) =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.activityChart(filter),
    queryFn: () => dashboardApi.getActivityChart(filter),
    staleTime: 5 * 60 * 1000,
  });

/** Admin recent enrollments table */
export const useRecentEnrollments = (limit = 10) =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.recentEnrollments(limit),
    queryFn: () => dashboardApi.getRecentEnrollments(limit),
    staleTime: 5 * 60 * 1000,
  });
