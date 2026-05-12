import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard-api";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { ActivityChartFilter } from "@/types/dashboard.types";

export const DASHBOARD_QUERY_KEYS = {
  enrollmentSummary: ["dashboard", "enrollment-summary"],
  hrStats: ["dashboard", "hr-stats"],
  hrEmployees: ["dashboard", "hr-employees"],
  managerStats: ["dashboard", "manager-stats"],
  pendingApprovals: ["dashboard", "pending-approvals"],
  adminStats: ["dashboard", "admin-stats"],
  activityChart: (filter: ActivityChartFilter) => ["dashboard", "activity-chart", filter],
  recentEnrollments: (limit: number) => ["dashboard", "recent-enrollments", limit],
  mySkillMatrix: ["dashboard", "my-skill-matrix"],
  trainingSessions: (month: string) => ["dashboard", "training-sessions", month],
  upcomingSessions: ["dashboard", "upcoming-sessions"],
};

/** Employee dashboard — enrollment counts + certificates */
export const useEnrollmentSummary = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.enrollmentSummary,
    queryFn: dashboardApi.getEnrollmentSummary,
    staleTime: 5 * 60 * 1000, // 5 min
  });

/** HR dashboard — company-wide employee count + learning stats */
export const useHrStats = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.hrStats,
    queryFn: dashboardApi.getHrStats,
    staleTime: 5 * 60 * 1000,
  });

/** HR dashboard — scoped per-employee list for chart and table */
export const useHrEmployees = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.hrEmployees,
    queryFn: dashboardApi.getHrEmployees,
    staleTime: 5 * 60 * 1000,
  });

/** Manager dashboard — team stats + member breakdown (preserved) */
export const useManagerStats = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.managerStats,
    queryFn: dashboardApi.getManagerStats,
    staleTime: 5 * 60 * 1000,
  });

/** Manager dashboard — pending training plan approvals + TNI reviews */
export const usePendingApprovals = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.pendingApprovals,
    queryFn: dashboardApi.getPendingApprovals,
    staleTime: 2 * 60 * 1000, // refresh more frequently — action-oriented data
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

/** Employee dashboard — skill matrix from job role requirements */
export const useMySkillMatrix = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.mySkillMatrix,
    queryFn: dashboardApi.getMySkillMatrix,
    staleTime: 10 * 60 * 1000,
  });

/**
 * Employee dashboard — training sessions for a given month.
 * Defaults to the current calendar month.
 */
export const useTrainingSessions = (date: Date = new Date()) => {
  const startAfter = format(startOfMonth(date), "yyyy-MM-dd");
  const startBefore = format(endOfMonth(date), "yyyy-MM-dd");
  const monthKey = format(date, "yyyy-MM");

  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.trainingSessions(monthKey),
    queryFn: () => dashboardApi.getTrainingSessions(startAfter, startBefore),
    staleTime: 5 * 60 * 1000,
  });
};

/** Employee dashboard — all upcoming sessions from today onwards */
export const useUpcomingSessions = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.upcomingSessions,
    queryFn: dashboardApi.getUpcomingSessions,
    staleTime: 5 * 60 * 1000,
  });
