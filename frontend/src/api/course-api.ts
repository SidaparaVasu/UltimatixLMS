import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { PaginatedResponse } from "./organization-api";
import { CourseCategory, CourseDetail, CourseMaster } from "@/types/courses.types";

/**
 * Course Management API - handles categories, courses, lessons, etc.
 * Base path: /api/v1/courses/
 */
export const courseApi = {
  // --- Categories ---
  getCategories: async (params?: any) => {
    try {
      const response = await apiClient.get("/courses/categories/", { params });
      return handleApiResponse<PaginatedResponse<CourseCategory>>(response.data, false);
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

  // --- Courses (Masters) ---
  getCourses: async (params?: any) => {
    try {
      const response = await apiClient.get("/courses/courses/", { params });
      return handleApiResponse<PaginatedResponse<CourseMaster>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getCourseDetails: async (id: number) => {
    try {
      // In backend, retrieving a course by ID fetches its complete visual path.
      const response = await apiClient.get(`/courses/courses/${id}/`);
      return handleApiResponse<CourseDetail>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createCourse: async (data: Partial<CourseMaster>) => {
    try {
      const response = await apiClient.post("/courses/courses/", data);
      return handleApiResponse<CourseMaster>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateCourse: async (id: number, data: Partial<CourseMaster>) => {
    try {
      const response = await apiClient.patch(`/courses/courses/${id}/`, data);
      return handleApiResponse<CourseMaster>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteCourse: async (id: number, softDelete: boolean = true) => {
    try {
      const response = await apiClient.delete(`/courses/courses/${id}/?soft_delete=${softDelete}`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Sections ---
  createSection: async (data: any) => {
    try {
      const response = await apiClient.post("/courses/sections/", data);
      return handleApiResponse<any>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateSection: async (id: number, data: any) => {
    try {
      const response = await apiClient.patch(`/courses/sections/${id}/`, data);
      return handleApiResponse<any>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteSection: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/sections/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Lessons ---
  createLesson: async (data: any) => {
    try {
      const response = await apiClient.post("/courses/lessons/", data);
      return handleApiResponse<any>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateLesson: async (id: number, data: any) => {
    try {
      const response = await apiClient.patch(`/courses/lessons/${id}/`, data);
      return handleApiResponse<any>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteLesson: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/lessons/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};

