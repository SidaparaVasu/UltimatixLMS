import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import { PaginatedResponse } from "./organization-api";
import { 
  CourseCategory, 
  CourseDetail, 
  CourseMaster, 
  CourseParticipant,
  CourseParticipantBulkInvitePayload,
  CourseSkillMapping,
  CourseTagMap,
  CurriculumSyncPayload,
  TagMaster,
  CourseDiscussionThread,
  CourseDiscussionReply,
  CourseNote,
  CourseNoteCreatePayload,
  CourseNoteUpdatePayload,
} from "@/types/courses.types";

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

  /** Check whether any learner has progress records for a lesson. */
  hasLessonProgress: async (id: number): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/courses/lessons/${id}/has-progress/`);
      const data = handleApiResponse<{ has_progress: boolean }>(response.data, false);
      return data?.has_progress ?? false;
    } catch {
      return false;
    }
  },

  /** Hard-delete a lesson — only succeeds when no progress records exist. */
  forceDeleteLesson: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/lessons/${id}/?force=true`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  syncCurriculum: async (id: number, data: CurriculumSyncPayload) => {
    try {
      const response = await apiClient.patch(`/courses/courses/${id}/curriculum-sync/`, data);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Tags ---
  getTags: async () => {
    try {
      const response = await apiClient.get("/courses/tags/");
      return handleApiResponse<PaginatedResponse<TagMaster>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createTag: async (data: { tag_name: string; description?: string }) => {
    try {
      const response = await apiClient.post("/courses/tags/", data);
      return handleApiResponse<TagMaster>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Tag Mappings ---
  addTagMapping: async (data: { course: number; tag: number }) => {
    try {
      const response = await apiClient.post("/courses/tag-mappings/", data);
      return handleApiResponse<CourseTagMap>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  removeTagMapping: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/tag-mappings/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Skill Mappings ---
  addSkillMapping: async (data: { course: number; skill: number; target_level: number }) => {
    try {
      const response = await apiClient.post("/courses/skill-mappings/", data);
      return handleApiResponse<CourseSkillMapping>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  removeSkillMapping: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/skill-mappings/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Course Resources ---
  getResources: async (courseId: number) => {
    try {
      const response = await apiClient.get("/courses/resources/", {
        params: { course: courseId, is_active: true },
      });
      return handleApiResponse<PaginatedResponse<import('@/types/courses.types').CourseResource>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createResource: async (data: { course: number; resource_title: string; resource_url?: string; file_ref?: string | null }) => {
    try {
      const response = await apiClient.post("/courses/resources/", data);
      return handleApiResponse<import('@/types/courses.types').CourseResource>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteResource: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/resources/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // --- Participants ---

  /**
   * List all invited participants for a course.
   * GET /courses/{courseId}/participants/
   */
  getParticipants: async (courseId: number) => {
    try {
      const response = await apiClient.get(`/courses/courses/${courseId}/participants/`);
      return handleApiResponse<CourseParticipant[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Bulk-invite employees to a course by their IDs.
   * POST /courses/{courseId}/participants/
   */
  inviteParticipants: async (courseId: number, payload: CourseParticipantBulkInvitePayload) => {
    try {
      const response = await apiClient.post(`/courses/courses/${courseId}/participants/`, payload);
      return handleApiResponse<{ invited: number; skipped: number }>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Remove a single participant from a course.
   * DELETE /courses/{courseId}/participants/{participantId}/
   */
  removeParticipant: async (courseId: number, participantId: number) => {
    try {
      const response = await apiClient.delete(
        `/courses/courses/${courseId}/participants/${participantId}/`
      );
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Discussion Threads ────────────────────────────────────────────────────

  getDiscussionThreads: async (courseId: number) => {
    try {
      const response = await apiClient.get("/courses/discussion-threads/", {
        params: { course: courseId, page_size: 100 },
      });
      return handleApiResponse<PaginatedResponse<CourseDiscussionThread>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createDiscussionThread: async (data: {
    course: number;
    thread_title: string;
    thread_body: string;
  }) => {
    try {
      const response = await apiClient.post("/courses/discussion-threads/", data);
      return handleApiResponse<CourseDiscussionThread>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteDiscussionThread: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/discussion-threads/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Discussion Replies ────────────────────────────────────────────────────

  createDiscussionReply: async (data: { thread: number; reply_text: string }) => {
    try {
      const response = await apiClient.post("/courses/discussion-replies/", data);
      return handleApiResponse<CourseDiscussionReply>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteDiscussionReply: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/discussion-replies/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  /**
   * GET /courses/notes/?enrollment_id=<id>
   * Returns all notes for the given enrollment, ordered by lesson then recency.
   */
  getNotes: async (enrollmentId: number) => {
    try {
      const response = await apiClient.get("/courses/notes/", {
        params: { enrollment_id: enrollmentId },
      });
      return handleApiResponse<CourseNote[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** POST /courses/notes/ */
  createNote: async (data: CourseNoteCreatePayload) => {
    try {
      const response = await apiClient.post("/courses/notes/", data);
      return handleApiResponse<CourseNote>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** PATCH /courses/notes/<id>/ */
  updateNote: async (id: number, data: CourseNoteUpdatePayload) => {
    try {
      const response = await apiClient.patch(`/courses/notes/${id}/`, data);
      return handleApiResponse<CourseNote>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /** DELETE /courses/notes/<id>/ */
  deleteNote: async (id: number) => {
    try {
      const response = await apiClient.delete(`/courses/notes/${id}/`);
      return handleApiResponse(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },
};

