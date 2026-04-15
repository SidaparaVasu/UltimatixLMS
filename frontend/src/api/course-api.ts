import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { PaginatedResponse } from "./organization-api";
import { CourseCategory } from "@/types/courses.types";

/**
 * Course Management API - handles categories, courses, lessons, etc.
 * Base path: /api/v1/courses/
 */
export const courseApi = {
  // --- Categories ---
  getCategories: async (params?: any) => {
    try {
      const response = await apiClient.get("/courses/categories/", { params });
      return handleApiResponse<PaginatedResponse<CourseCategory>>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createCategory: async (data: Partial<CourseCategory>) => {
    try {
      const response = await apiClient.post("/courses/categories/", data);
      return handleApiResponse<CourseCategory>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateCategory: async (id: number, data: Partial<CourseCategory>) => {
    try {
      const response = await apiClient.patch(`/courses/categories/${id}/`, data);
      return handleApiResponse<CourseCategory>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteCategory: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/categories/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
