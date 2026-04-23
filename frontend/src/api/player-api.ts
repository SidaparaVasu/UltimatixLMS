/**
 * API calls specific to the Course Player.
 * Follows the same pattern as learning-api.ts and course-api.ts.
 */

import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";
import {
  DetailedEnrollmentProgress,
  HeartbeatPayload,
  AssessmentAttempt,
  UserAnswerLifecycle,
  AttemptResult,
  AssessmentInfo,
} from "@/types/player.types";

export const playerApi = {
  /**
   * Get detailed enrollment progress with nested lesson/content progress.
   * Endpoint: GET /api/v1/learning/my-learning/:id/
   */
  getEnrollmentProgress: async (enrollmentId: number) => {
    try {
      const response = await apiClient.get(`/learning/my-learning/${enrollmentId}/`);
      return handleApiResponse<DetailedEnrollmentProgress>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Request a short-lived signed token for secure document viewing.
   * Token is valid for 5 minutes and tied to the requesting user.
   * Endpoint: POST /api/v1/files/files/request-token/
   */
  requestDocumentToken: async (fileRef: string): Promise<{ token: string; expires_in: number } | null> => {
    try {
      const response = await apiClient.post('/files/files/request-token/', { file_ref: fileRef });
      return handleApiResponse<{ token: string; expires_in: number }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Sync heartbeat (playhead position) for a content item.
   * Endpoint: POST /api/v1/learning/heartbeat/sync/
   */
  syncHeartbeat: async (payload: HeartbeatPayload) => {
    try {
      const response = await apiClient.post("/learning/heartbeat/sync/", payload);
      return handleApiResponse<{ playhead: number }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Mark a lesson as complete.
   * Backend requires playhead_seconds > 0 to set is_completed = True.
   * We send playhead_seconds: 1 as the minimum valid value.
   */
  markLessonComplete: async (enrollmentId: number, lessonId: number, contentId: number) => {
    try {
      const response = await apiClient.post("/learning/heartbeat/sync/", {
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        content_id: contentId,
        playhead_seconds: 1,   // must be > 0 for backend to set is_completed = true
        signal_completion: true,
      });
      return handleApiResponse(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ─── Assessment / Quiz APIs ─────────────────────────────────────────────────

  /**
   * Get assessment metadata for a lesson (learner-safe — no questions/answers).
   * Includes attempt history (attempts_used, attempts_remaining) for the current user.
   * Endpoint: GET /api/v1/assessment/learner/?lesson_id=:id
   */
  getAssessmentByLesson: async (lessonId: number) => {
    try {
      const response = await apiClient.get("/assessment/learner/", {
        params: { lesson_id: lessonId },
      });
      return handleApiResponse<AssessmentInfo[]>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Start a new assessment attempt.
   * Endpoint: POST /api/v1/assessment/attempts/start/
   */
  startAttempt: async (assessmentId: number) => {
    try {
      const response = await apiClient.post("/assessment/attempts/start/", {
        assessment_id: assessmentId,
      });
      return handleApiResponse<AssessmentAttempt>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get the next question in the attempt.
   * Endpoint: GET /api/v1/assessment/attempts/:id/next-question/
   */
  getNextQuestion: async (attemptId: string) => {
    try {
      const response = await apiClient.get(`/assessment/attempts/${attemptId}/next-question/`);
      return handleApiResponse<UserAnswerLifecycle | { completed: boolean }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Submit an answer for a question.
   * Endpoint: POST /api/v1/assessment/attempts/:id/submit-question/
   */
  submitQuestion: async (
    attemptId: string,
    payload: {
      question_id: string;
      selected_options?: number[];
      answer_text?: string;
    }
  ) => {
    try {
      const response = await apiClient.post(
        `/assessment/attempts/${attemptId}/submit-question/`,
        payload
      );
      return handleApiResponse<{ on_time: boolean; status: string }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Finalize the attempt (triggers grading).
   * Endpoint: POST /api/v1/assessment/attempts/:id/finalize/
   */
  finalizeAttempt: async (attemptId: string) => {
    try {
      const response = await apiClient.post(`/assessment/attempts/${attemptId}/finalize/`);
      return handleApiResponse<{ status: string }>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get the result of a completed attempt.
   * Endpoint: GET /api/v1/assessment/attempts/:id/result/
   */
  getAttemptResult: async (attemptId: string) => {
    try {
      const response = await apiClient.get(`/assessment/attempts/${attemptId}/result/`);
      return handleApiResponse<AttemptResult>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
