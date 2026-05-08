import { apiClient } from './axios-client';
import { handleApiResponse, handleApiError } from '@/utils/api-utils';
import { PaginatedResponse } from './organization-api';
import {
  QuestionBankItem,
  QuestionBankFilters,
  CreateQuestionPayload,
  BulkUploadResult,
} from '@/types/question-bank.types';

const BASE = '/assessment/questions';

export const questionBankApi = {
  /**
   * GET /assessment/questions/
   * Returns questions filtered to the requesting user's organisation.
   * Supports filtering by skill, skill_level, question_type, is_active, search.
   */
  list: async (filters?: QuestionBankFilters) => {
    try {
      const response = await apiClient.get(`${BASE}/`, { params: filters });
      return handleApiResponse<PaginatedResponse<QuestionBankItem>>(response.data, false);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/questions/
   * Creates a new question with nested options.
   */
  create: async (data: CreateQuestionPayload) => {
    try {
      const response = await apiClient.post(`${BASE}/`, data);
      return handleApiResponse<QuestionBankItem>(response.data);
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * POST /assessment/questions/bulk-upload/
   * Uploads a CSV or Excel file. Validates ALL rows before importing.
   * Returns error report if any row fails — nothing is imported in that case.
   */
  bulkUpload: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`${BASE}/bulk-upload/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return handleApiResponse<BulkUploadResult>(response.data, false);
    } catch (error) {
      // Return the error response body so the UI can display per-row errors
      const axiosError = error as any;
      if (axiosError?.response?.data) {
        const body = axiosError.response.data;
        // Backend returns { success: false, message: "...", errors: [...] }
        return {
          imported: 0,
          errors: body.errors ?? [],
        } as BulkUploadResult;
      }
      return handleApiError(error);
    }
  },

  /**
   * GET /assessment/questions/bulk-upload-template/
   * Downloads the CSV template file as a Blob.
   */
  downloadTemplate: async (): Promise<void> => {
    try {
      const response = await apiClient.get(`${BASE}/bulk-upload-template/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'question_bank_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error);
    }
  },
};
