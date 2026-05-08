import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi } from '@/api/question-bank-api';
import { QuestionBankFilters, CreateQuestionPayload } from '@/types/question-bank.types';

export const QUESTION_BANK_KEYS = {
  all:  () => ['question-bank'] as const,
  list: (filters?: QuestionBankFilters) => ['question-bank', 'list', filters] as const,
};

/**
 * Fetches the paginated question bank list filtered to the current user's org.
 */
export const useQuestionBankList = (filters?: QuestionBankFilters) =>
  useQuery({
    queryKey: QUESTION_BANK_KEYS.list(filters),
    queryFn:  () => questionBankApi.list(filters),
    staleTime: 30_000,
  });

/**
 * Creates a new question. Invalidates the list on success.
 */
export const useCreateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionPayload) => questionBankApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUESTION_BANK_KEYS.all() });
    },
  });
};

/**
 * Bulk-uploads questions from a CSV or Excel file.
 * Does NOT auto-invalidate — caller decides based on result (errors vs success).
 */
export const useBulkUploadQuestions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => questionBankApi.bulkUpload(file),
    onSuccess: (result) => {
      if (result && result.imported > 0) {
        qc.invalidateQueries({ queryKey: QUESTION_BANK_KEYS.all() });
      }
    },
  });
};
