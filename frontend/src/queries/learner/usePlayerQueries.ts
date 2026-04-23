/**
 * TanStack Query hooks for the Course Player.
 * Follows the same pattern as useLearnerQueries.ts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playerApi } from '@/api/player-api';
import { HeartbeatPayload } from '@/types/player.types';

export const PLAYER_QUERY_KEYS = {
  enrollmentProgress: (id: number) => ['player', 'enrollment-progress', id],
  assessmentByLesson: (lessonId: number) => ['player', 'assessment', 'lesson', lessonId],
  nextQuestion: (attemptId: string) => ['player', 'attempt', attemptId, 'next-question'],
  attemptResult: (attemptId: string) => ['player', 'attempt', attemptId, 'result'],
};

/**
 * Fetches detailed enrollment progress (with nested lesson/content progress).
 * Refetches on window focus to keep progress in sync.
 */
export const useEnrollmentProgress = (enrollmentId: number) =>
  useQuery({
    queryKey: PLAYER_QUERY_KEYS.enrollmentProgress(enrollmentId),
    queryFn: () => playerApi.getEnrollmentProgress(enrollmentId),
    enabled: !!enrollmentId,
    refetchOnWindowFocus: true,
    staleTime: 30_000, // 30s — progress doesn't change that fast
  });

/**
 * Heartbeat mutation — fires every 10s from VideoPlayer.
 * Silent: no toast on success.
 */
export const useHeartbeat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: HeartbeatPayload) => playerApi.syncHeartbeat(payload),
    onSuccess: (_data, variables) => {
      // If signal_completion was sent, invalidate progress to refresh sidebar
      if (variables.signal_completion) {
        queryClient.invalidateQueries({
          queryKey: ['player', 'enrollment-progress', variables.enrollment_id],
        });
        // Also invalidate the learner enrollments list (for My Learning page)
        queryClient.invalidateQueries({ queryKey: ['learner', 'my-enrollments'] });
      }
    },
  });
};

/**
 * Mark lesson complete — wraps heartbeat with signal_completion: true.
 */
export const useMarkLessonComplete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      enrollmentId,
      lessonId,
      contentId,
    }: {
      enrollmentId: number;
      lessonId: number;
      contentId: number;
    }) => playerApi.markLessonComplete(enrollmentId, lessonId, contentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PLAYER_QUERY_KEYS.enrollmentProgress(variables.enrollmentId),
      });
      queryClient.invalidateQueries({ queryKey: ['learner', 'my-enrollments'] });
    },
  });
};

/**
 * Get assessment linked to a lesson.
 */
export const useAssessmentByLesson = (lessonId: number, enabled = true) =>
  useQuery({
    queryKey: PLAYER_QUERY_KEYS.assessmentByLesson(lessonId),
    queryFn: () => playerApi.getAssessmentByLesson(lessonId),
    enabled: !!lessonId && enabled,
    staleTime: 0,  // always refetch — assessment status can change (DRAFT → PUBLISHED)
  });

/**
 * Start a new assessment attempt.
 */
export const useStartAttempt = () =>
  useMutation({
    mutationFn: (assessmentId: number) => playerApi.startAttempt(assessmentId),
  });

/**
 * Get the next question for an active attempt.
 */
export const useNextQuestion = (attemptId: string | null, enabled = true) =>
  useQuery({
    queryKey: PLAYER_QUERY_KEYS.nextQuestion(attemptId ?? ''),
    queryFn: () => playerApi.getNextQuestion(attemptId!),
    enabled: !!attemptId && enabled,
    // Don't cache — always fetch fresh question
    staleTime: 0,
    gcTime: 0,
  });

/**
 * Submit an answer for a question.
 */
export const useSubmitQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: { question_id: string; selected_options?: number[]; answer_text?: string };
    }) => playerApi.submitQuestion(attemptId, payload),
    onSuccess: (_data, variables) => {
      // Invalidate next-question so it refetches
      queryClient.invalidateQueries({
        queryKey: PLAYER_QUERY_KEYS.nextQuestion(variables.attemptId),
      });
    },
  });
};

/**
 * Finalize an attempt (triggers grading).
 */
export const useFinalizeAttempt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => playerApi.finalizeAttempt(attemptId),
    onSuccess: (_data, attemptId) => {
      // Invalidate result query so it becomes available
      queryClient.invalidateQueries({
        queryKey: PLAYER_QUERY_KEYS.attemptResult(attemptId),
      });
    },
  });
};

/**
 * Get the result of a completed attempt.
 */
export const useAttemptResult = (attemptId: string | null, enabled = true) =>
  useQuery({
    queryKey: PLAYER_QUERY_KEYS.attemptResult(attemptId ?? ''),
    queryFn: () => playerApi.getAttemptResult(attemptId!),
    enabled: !!attemptId && enabled,
    staleTime: 60_000,
  });
