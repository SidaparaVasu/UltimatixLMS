import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import {
  NextQuestionResponse,
  ResumeAttemptResponse,
  SubmitAnswerPayload,
} from '@/types/assessment-player.types';

const BASE = '/assessment/attempts';

export const assessmentPlayerApi = {
  /**
   * GET /assessment/attempts/:id/resume/
   * Resumes an in-progress attempt after a disconnect or tab close.
   * - If expired: auto-finalizes and returns { finalized: true }
   * - If active: returns remaining_seconds + next unanswered question
   */
  resume: async (attemptId: string) => {
    try {
      const response = await apiClient.get(`${BASE}/${attemptId}/resume/`);
      return handleApiResponse<ResumeAttemptResponse>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/attempts/:id/next-question/
   * Returns the next NOT_VISITED question and starts its per-question timer.
   * Returns { completed: true } when all questions have been answered.
   */
  nextQuestion: async (attemptId: string) => {
    try {
      const response = await apiClient.get(`${BASE}/${attemptId}/next-question/`);
      return handleApiResponse<NextQuestionResponse | { completed: true }>(
        response.data,
        false,
      );
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/attempts/:id/submit-question/
   * Submits the learner's answer for the current question.
   * Backend enforces hard timing — returns { on_time: bool, status: string }.
   */
  submitAnswer: async (attemptId: string, payload: SubmitAnswerPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/${attemptId}/submit-question/`, {
        question_id: payload.question_id,
        selected_options: payload.selected_options,
        answer_text: payload.answer_text,
      });
      return handleApiResponse<{ on_time: boolean; status: string }>(
        response.data,
        false,
      );
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/attempts/:id/finalize/
   * Triggers the grading engine. Called after all questions are answered,
   * on overall timer expiry, or on the 3rd tab-switch violation.
   */
  finalize: async (attemptId: string) => {
    try {
      const response = await apiClient.post(`${BASE}/${attemptId}/finalize/`);
      return handleApiResponse<{ status: string }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/attempts/:id/result/
   * Returns the graded result for a completed attempt.
   * Only accessible after the attempt status is COMPLETED.
   */
  getResult: async (attemptId: string) => {
    try {
      const response = await apiClient.get(`${BASE}/${attemptId}/result/`);
      return handleApiResponse<{
        id: number;
        attempt: string;
        total_score: number;
        score_percentage: number;
        status: 'PASS' | 'FAIL' | 'PENDING';
        grading_type: string;
        instructor_feedback: string;
      }>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },
};
