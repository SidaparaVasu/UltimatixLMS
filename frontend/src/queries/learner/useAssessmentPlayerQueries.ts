import { useMutation } from '@tanstack/react-query';
import { assessmentPlayerApi } from '@/api/assessment-player-api';
import { SubmitAnswerPayload } from '@/types/assessment-player.types';

/**
 * Resumes an in-progress attempt after a disconnect or tab close.
 * Used as a direct async call (not a useQuery) because it's called
 * imperatively on page load, not as a reactive data fetch.
 *
 * Usage: const { mutateAsync: resumeAttempt } = useResumeAttempt();
 */
export const useResumeAttempt = () =>
  useMutation({
    mutationFn: (attemptId: string) => assessmentPlayerApi.resume(attemptId),
  });

/**
 * Fetches the next unanswered question for the active attempt.
 * Used as a direct async call — called imperatively after each answer submission.
 *
 * Usage: const { mutateAsync: fetchNextQuestion } = useNextQuestion();
 */
export const useNextQuestion = () =>
  useMutation({
    mutationFn: (attemptId: string) => assessmentPlayerApi.nextQuestion(attemptId),
  });

/**
 * Submits the learner's answer for the current question.
 * Called on "Next / Submit" click and on per-question timer expiry.
 *
 * Usage: const { mutateAsync: submitAnswer } = useSubmitAnswer();
 */
export const useSubmitAnswer = () =>
  useMutation({
    mutationFn: ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: SubmitAnswerPayload;
    }) => assessmentPlayerApi.submitAnswer(attemptId, payload),
  });

/**
 * Finalizes the attempt and triggers the grading engine.
 * Called after all questions are answered, on overall timer expiry,
 * or on the 3rd tab-switch violation.
 *
 * Usage: const { mutateAsync: finalizeAttempt } = useFinalizeAttempt();
 */
export const useFinalizeAttempt = () =>
  useMutation({
    mutationFn: (attemptId: string) => assessmentPlayerApi.finalize(attemptId),
  });
