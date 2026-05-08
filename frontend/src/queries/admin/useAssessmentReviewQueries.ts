import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentReviewApi } from '@/api/assessment-review-api';
import { ManualGradePayload, RetakeGrantPayload } from '@/types/assessment-review.types';

export const REVIEW_KEYS = {
  queue:  (params?: object) => ['assessment', 'review', 'queue', params],
  detail: (id: string)      => ['assessment', 'review', 'detail', id],
};

export const useReviewQueue = (params?: { assessment?: number; course?: number; standalone?: 'true' | 'false'; page?: number }) =>
  useQuery({
    queryKey: REVIEW_KEYS.queue(params),
    queryFn:  () => assessmentReviewApi.getQueue({ ...params, page_size: 20 }),
    staleTime: 30_000,
  });

export const useReviewDetail = (attemptId: string) =>
  useQuery({
    queryKey: REVIEW_KEYS.detail(attemptId),
    queryFn:  () => assessmentReviewApi.getDetail(attemptId),
    enabled:  !!attemptId,
    staleTime: 0,
  });

export const useSubmitGrades = (attemptId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ManualGradePayload) =>
      assessmentReviewApi.submitGrades(attemptId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment', 'review', 'queue'] });
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.detail(attemptId) });
    },
  });
};

export const useGrantRetake = (attemptId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: RetakeGrantPayload) =>
      assessmentReviewApi.grantRetake(attemptId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.detail(attemptId) });
    },
  });
};
