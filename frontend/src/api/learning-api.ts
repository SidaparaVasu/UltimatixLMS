import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { PaginatedResponse } from "./organization-api";
import { UserCourseEnrollment, CourseCertificate, EnrollRequest } from "@/types/courses.types";

export const learningApi = {
  // Get current user enrollments
  getMyEnrollments: async (params?: { status?: string; page?: number; page_size?: number }) => {
    try {
      const response = await apiClient.get("/learning/my-learning/", { params });
      return handleApiResponse<PaginatedResponse<UserCourseEnrollment>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Enroll in a course
  enrollInCourse: async (data: EnrollRequest) => {
    try {
      const response = await apiClient.post("/learning/my-learning/enroll/", data);
      return handleApiResponse<UserCourseEnrollment>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get enrollment summary counts for dashboard
  getEnrollmentSummary: async () => {
    try {
      const response = await apiClient.get("/learning/my-learning/summary/");
      return handleApiResponse<{ in_progress: number; completed: number; not_started: number; overdue: number; certificates_earned: number }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Get user certificates
  getMyCertificates: async () => {
    try {
      const response = await apiClient.get("/learning/certificates/");
      return handleApiResponse<PaginatedResponse<CourseCertificate>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Admin action: set or clear a per-learner deadline override.
   * PATCH /learning/my-learning/{enrollmentId}/extend-due-date/
   * Pass null to clear the override.
   */
  extendDueDate: async (enrollmentId: number, extendedDueDate: string | null) => {
    try {
      const response = await apiClient.patch(
        `/learning/my-learning/${enrollmentId}/extend-due-date/`,
        { extended_due_date: extendedDueDate },
      );
      return handleApiResponse<UserCourseEnrollment>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};