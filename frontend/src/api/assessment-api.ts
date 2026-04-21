import { apiClient } from "./axios-client";
import { handleApiResponse, handleApiError } from "@/utils/api-utils";

/**
 * Assessment Studio API — used by instructors to manage quizzes in the Course Builder.
 * Base path: /api/v1/assessments/
 */

export interface AssessmentConfig {
  title?: string;
  duration_minutes: number;
  passing_percentage: number;
  retake_limit: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  negative_marking_percentage: number;
}

export interface QuestionOptionPayload {
  option_text: string;
  is_correct: boolean;
  display_order: number;
  feedback_text?: string;
}

export interface QuestionPayload {
  question_text: string;
  question_type: string;
  scenario_text?: string;
  explanation_text?: string;
  difficulty_complexity?: number;
  options?: QuestionOptionPayload[];
}

export interface SyncQuestionsPayload {
  questions: Array<{
    question_id: string; // UUID from QuestionBank
    weight: number;
  }>;
}

export interface AssessmentDetail {
  id: number;
  title: string;
  lesson: number | null;
  course: number;
  duration_minutes: number;
  passing_percentage: number;
  retake_limit: number;
  is_randomized: boolean;
  negative_marking_enabled: boolean;
  negative_marking_percentage: number;
  status: string;
  questions?: BackendQuestion[];
}

export interface BackendQuestion {
  id: string; // UUID
  question_text: string;
  question_type: string;
  scenario_text: string;
  explanation_text: string;
  difficulty_complexity: number;
  is_active: boolean;
  options: Array<{
    id: number;
    option_text: string;
    is_correct: boolean;
    display_order: number;
    feedback_text: string;
  }>;
}

export const assessmentApi = {
  /**
   * Fetch the assessment linked to a specific lesson.
   * Returns null if no assessment exists for the lesson.
   */
  getAssessmentForLesson: async (lessonId: number): Promise<AssessmentDetail | null> => {
    try {
      const response = await apiClient.get("/assessment/studio/", {
        params: { lesson_id: lessonId },
      });
      const result = handleApiResponse<{ results: AssessmentDetail[] }>(response.data, false);
      if (!result || !result.results || result.results.length === 0) return null;
      // Fetch full detail with questions
      const detail = await assessmentApi.getAssessmentDetail(result.results[0].id);
      return detail;
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  /**
   * Fetch a single assessment by id (includes questions via serializer).
   */
  getAssessmentDetail: async (id: number): Promise<AssessmentDetail | null> => {
    try {
      const response = await apiClient.get(`/assessment/studio/${id}/`);
      return handleApiResponse<AssessmentDetail>(response.data, false);
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  /**
   * Create a new AssessmentMaster linked to a lesson.
   */
  createAssessment: async (
    lessonId: number,
    courseId: number,
    config: AssessmentConfig
  ): Promise<AssessmentDetail | null> => {
    try {
      const response = await apiClient.post("/assessment/studio/", {
        lesson: lessonId,
        course: courseId,
        title: config.title || "Lesson Quiz",
        duration_minutes: config.duration_minutes,
        passing_percentage: config.passing_percentage,
        retake_limit: config.retake_limit,
        is_randomized: config.is_randomized,
        negative_marking_enabled: config.negative_marking_enabled,
        negative_marking_percentage: config.negative_marking_percentage,
      });
      return handleApiResponse<AssessmentDetail>(response.data);
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  /**
   * Update an existing AssessmentMaster's configuration.
   */
  updateAssessment: async (
    id: number,
    config: Partial<AssessmentConfig>
  ): Promise<AssessmentDetail | null> => {
    try {
      const response = await apiClient.patch(`/assessment/studio/${id}/`, config);
      return handleApiResponse<AssessmentDetail>(response.data);
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  /**
   * Create a single question in the QuestionBank (with nested options).
   * Returns the created question including its UUID.
   */
  createQuestion: async (data: QuestionPayload): Promise<BackendQuestion | null> => {
    try {
      const response = await apiClient.post("/assessment/questions/", data);
      return handleApiResponse<BackendQuestion>(response.data);
    } catch (error) {
      handleApiError(error);
      return null;
    }
  },

  /**
   * Bulk-sync questions to an assessment.
   * Replaces all existing question mappings with the provided list.
   */
  syncQuestions: async (
    assessmentId: number,
    payload: SyncQuestionsPayload
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post(
        `/assessment/studio/${assessmentId}/sync-questions/`,
        payload
      );
      return handleApiResponse(response.data) !== null;
    } catch (error) {
      handleApiError(error);
      return false;
    }
  },
};
