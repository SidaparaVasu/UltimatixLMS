import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentReviewApi } from '@/api/assessment-review-api';
import { ManualGradePayload, RetakeGrantPayload } from '@/types/assessment-review.types';
import { PLAYER_QUERY_KEYS } from '@/queries/learner/usePlayerQueries';

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
      // Invalidate the review queue and this attempt's detail
      qc.invalidateQueries({ queryKey: ['assessment', 'review', 'queue'] });
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.detail(attemptId) });

      // Invalidate the learner's course player cache so the updated result status
      // (PENDING → PASS/FAIL) is reflected immediately without a page refresh.
      // We read lesson_id from the already-cached review detail to be precise.
      const detail = qc.getQueryData<Awaited<ReturnType<typeof assessmentReviewApi.getDetail>>>(
        REVIEW_KEYS.detail(attemptId)
      );
      if (detail?.lesson_id) {
        qc.invalidateQueries({ queryKey: PLAYER_QUERY_KEYS.assessmentByLesson(detail.lesson_id) });
      }
    },
  });
};

export const useGrantRetake = (attemptId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: RetakeGrantPayload) =>
      assessmentReviewApi.grantRetake(attemptId, payload),
    onSuccess: () => {
      // Invalidate the review queue and this attempt's detail
      qc.invalidateQueries({ queryKey: ['assessment', 'review', 'queue'] });
      qc.invalidateQueries({ queryKey: REVIEW_KEYS.detail(attemptId) });

      // Invalidate the learner's course player cache so the updated attempts_remaining
      // is reflected immediately, enabling the retake button without a page refresh.
      const detail = qc.getQueryData<Awaited<ReturnType<typeof assessmentReviewApi.getDetail>>>(
        REVIEW_KEYS.detail(attemptId)
      );
      if (detail?.lesson_id) {
        qc.invalidateQueries({ queryKey: PLAYER_QUERY_KEYS.assessmentByLesson(detail.lesson_id) });
      }
    },
  });
};
