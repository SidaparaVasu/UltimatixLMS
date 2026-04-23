/**
 * Full quiz flow: intro → question → finalizing → result
 *
 * UX improvements:
 * - Intro: question count, attempt history (X of Y used), disabled start when exhausted
 * - Question: "Question X of Y" header + progress bar, per-question timer with urgency
 * - Result: score ring, stats (attempted/correct/total), feedback, retry or next lesson
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList, Clock, CheckCircle, XCircle,
  ChevronRight, RotateCcw, AlertCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { CourseLesson } from '@/types/courses.types';
import {
  DetailedEnrollmentProgress,
  LessonProgress,
  AssessmentAttempt,
  UserAnswerLifecycle,
  AttemptResult,
  AssessmentInfo,
} from '@/types/player.types';
import {
  useAssessmentByLesson,
  useStartAttempt,
  useSubmitQuestion,
  useFinalizeAttempt,
  useAttemptResult,
  useMarkLessonComplete,
} from '@/queries/learner/usePlayerQueries';
import { useCoursePlayerStore } from '@/stores/coursePlayerStore';
import { LessonNavFooter } from './LessonNavFooter';
import { playerApi } from '@/api/player-api';

interface AssessmentPlayerProps {
  lesson: CourseLesson;
  enrollment: DetailedEnrollmentProgress;
  lessonProgress: LessonProgress | undefined;
  nextLesson: CourseLesson | null;
}

type QuizPhase = 'intro' | 'question' | 'finalizing' | 'result';

export const AssessmentPlayer = ({
  lesson,
  enrollment,
  lessonProgress,
  nextLesson,
}: AssessmentPlayerProps) => {
  const { showLessonCompleteOverlay } = useCoursePlayerStore();
  const markCompleteMutation = useMarkLessonComplete();

  const isAlreadyCompleted = lessonProgress?.status === 'COMPLETED';

  const [phase, setPhase] = useState<QuizPhase>('intro');
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<UserAnswerLifecycle | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFinalizing = useRef(false);

  const { data: assessments, isLoading: assessmentLoading } = useAssessmentByLesson(lesson.id);
  const assessment: AssessmentInfo | null = assessments?.[0] ?? null;

  const startAttemptMutation = useStartAttempt();
  const submitQuestionMutation = useSubmitQuestion();
  const finalizeAttemptMutation = useFinalizeAttempt();

  const { data: resultData } = useAttemptResult(
    attempt?.id ?? null,
    phase === 'finalizing'
  );

  // Transition to result when grading completes
  useEffect(() => {
    if (!resultData || phase !== 'finalizing') return;
    setResult(resultData);
    setPhase('result');
    isFinalizing.current = false;

    if (resultData.status === 'PASS') {
      const firstContent = lesson.contents?.[0];
      if (firstContent) {
        markCompleteMutation.mutate(
          { enrollmentId: enrollment.id, lessonId: lesson.id, contentId: firstContent.id },
          { onSuccess: () => showLessonCompleteOverlay(lesson.id) }
        );
      }
    }
  }, [resultData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-question countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft !== null && timeLeft > 0 ? 'active' : 'inactive']); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && phase === 'question' && currentQuestion) {
      handleSubmitQuestion(true);
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNextQuestion = useCallback(async (attemptId: string) => {
    setIsLoadingQuestion(true);
    try {
      const data = await playerApi.getNextQuestion(attemptId);
      if (!data) return;

      if ('completed' in data && data.completed) {
        if (!isFinalizing.current) {
          isFinalizing.current = true;
          setPhase('finalizing');
          await finalizeAttemptMutation.mutateAsync(attemptId);
        }
        return;
      }

      const qa = data as UserAnswerLifecycle;
      setCurrentQuestion(qa);
      setSelectedOptions([]);
      setAnswerText('');
      setTimeLeft(qa.time_limit_seconds > 0 ? qa.time_limit_seconds : null);
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [finalizeAttemptMutation]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartQuiz = useCallback(async () => {
    if (!assessment) return;
    const newAttempt = await startAttemptMutation.mutateAsync(assessment.id);
    if (!newAttempt) return;
    setAttempt(newAttempt);
    setPhase('question');
    await fetchNextQuestion(newAttempt.id);
  }, [assessment, startAttemptMutation, fetchNextQuestion]);

  const handleSubmitQuestion = useCallback(async (timedOut = false) => {
    if (!attempt || !currentQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);

    await submitQuestionMutation.mutateAsync({
      attemptId: attempt.id,
      payload: {
        question_id: currentQuestion.question.id,
        selected_options: timedOut ? [] : selectedOptions,
        answer_text: timedOut ? '' : answerText,
      },
    });

    await fetchNextQuestion(attempt.id);
  }, [attempt, currentQuestion, selectedOptions, answerText, submitQuestionMutation, fetchNextQuestion]);

  const handleRetry = useCallback(() => {
    setPhase('intro');
    setAttempt(null);
    setCurrentQuestion(null);
    setSelectedOptions([]);
    setAnswerText('');
    setResult(null);
    setTimeLeft(null);
    isFinalizing.current = false;
  }, []);

  const toggleOption = (optionId: number) => {
    const isMultiSelect = currentQuestion?.question.question_type === 'MSQ';
    if (isMultiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (assessmentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-500">No assessment found for this lesson.</p>
      </div>
    );
  }

  const attemptsExhausted = assessment.attempts_remaining === 0 && !isAlreadyCompleted;

  // ── Intro Screen ──────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                  {assessment.title}
                </h2>
                {assessment.description && (
                  <p className="text-sm text-gray-500 mt-1">{assessment.description}</p>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="Questions" value={String(assessment.question_count)} />
              <StatCard label="Duration" value={`${assessment.duration_minutes} min`} />
              <StatCard label="Passing Score" value={`${assessment.passing_percentage}%`} />
              <StatCard
                label="Attempts"
                value={`${assessment.attempts_used} / ${assessment.retake_limit}`}
                highlight={attemptsExhausted}
              />
            </div>

            {/* Negative marking notice */}
            {assessment.negative_marking_enabled && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5 mb-4">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Negative marking is enabled. Incorrect answers will deduct points.
                </p>
              </div>
            )}

            {/* Already passed */}
            {isAlreadyCompleted && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2.5 mb-4">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-700">
                  You have already passed this quiz.
                </p>
              </div>
            )}

            {/* Attempts exhausted */}
            {attemptsExhausted && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5 mb-4">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-medium text-red-700">
                  You have used all {assessment.retake_limit} attempt{assessment.retake_limit !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Start button */}
            <button
              onClick={handleStartQuiz}
              disabled={startAttemptMutation.isPending || attemptsExhausted}
              className="btn w-full"
            >
              {startAttemptMutation.isPending
                ? 'Starting...'
                : isAlreadyCompleted
                ? 'Retake Quiz'
                : 'Start Quiz'}
            </button>
          </div>
        </div>

        <LessonNavFooter
          lesson={lesson}
          nextLesson={nextLesson}
          isCompleted={isAlreadyCompleted ?? false}
        />
      </div>
    );
  }

  // ── Question Screen ───────────────────────────────────────────────────────

  if (phase === 'question') {
    if (isLoadingQuestion || !currentQuestion) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
        </div>
      );
    }

    const { question, question_number, total_questions } = currentQuestion;
    const isMultiSelect = question.question_type === 'MSQ';
    // Types that require a written text answer (no options)
    const isTextAnswer =
      question.question_type === 'SHORT_ANSWER' ||
      question.question_type === 'DESCRIPTIVE';
    // SCENARIO: show options if they exist, otherwise fall back to textarea
    const isScenario = question.question_type === 'SCENARIO';
    const scenarioHasOptions = isScenario && question.options.length > 0;
    const showTextarea = isTextAnswer || (isScenario && !scenarioHasOptions);
    const showOptions = !isTextAnswer && (question.options.length > 0);
    const isFileUpload = question.question_type === 'FILE_UPLOAD';
    const canSubmit = isFileUpload
      ? true  // file upload — allow skip
      : showTextarea
      ? answerText.trim().length > 0
      : selectedOptions.length > 0;
    const progressPct = total_questions > 0 ? ((question_number - 1) / total_questions) * 100 : 0;
    const isTimerUrgent = timeLeft !== null && timeLeft <= 10;

    return (
      <div className="flex flex-col h-full">
        {/* Question header bar */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Question {question_number} of {total_questions}
            </span>

            {/* Per-question timer */}
            {timeLeft !== null && (
              <span
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold tabular-nums px-2 py-1 rounded-md',
                  isTimerUrgent
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {formatTime(timeLeft)}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6">
            {/* Scenario */}
            {question.scenario_text && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-5 text-sm text-gray-700 leading-relaxed">
                {question.scenario_text}
              </div>
            )}

            {/* Question text */}
            <p className="text-base font-medium text-gray-900 mb-1 leading-snug">
              {question.question_text}
            </p>
            <p className="text-xs text-gray-400 mb-5">
              {isMultiSelect
                ? 'Select all that apply'
                : showTextarea
                ? 'Type your answer below'
                : isFileUpload
                ? 'File upload (not yet supported — skip this question)'
                : 'Select one answer'}
            </p>

            {/* MCQ / MSQ / TRUE_FALSE / SCENARIO (with options) */}
            {showOptions && (
              <div className="space-y-2">
                {question.options.map((option, idx) => {
                  const isSelected = selectedOptions.includes(option.id);
                  const label = String.fromCharCode(65 + idx); // A, B, C, D
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 px-4 py-3 rounded-md border text-sm transition-colors',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      {/* Option label circle */}
                      <span
                        className={cn(
                          'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5',
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 text-gray-400'
                        )}
                      >
                        {label}
                      </span>
                      <span className="flex-1 leading-snug">{option.option_text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short answer / Descriptive / Scenario (no options) textarea */}
            {showTextarea && (
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={
                  question.question_type === 'DESCRIPTIVE'
                    ? 'Write your detailed answer here...'
                    : 'Type your answer here...'
                }
                rows={question.question_type === 'DESCRIPTIVE' ? 8 : 5}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-none"
              />
            )}

            {/* File upload — not yet supported */}
            {isFileUpload && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-3 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                File upload questions are not supported in the player yet. You may skip this question.
              </div>
            )}
          </div>
        </div>

        {/* Submit footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">
            {isMultiSelect ? 'You can select multiple options' : ''}
          </span>
          <button
            onClick={() => handleSubmitQuestion(false)}
            disabled={!canSubmit || submitQuestionMutation.isPending}
            className="btn"
          >
            {submitQuestionMutation.isPending ? 'Saving...' : (
              question_number === total_questions ? 'Submit Quiz' : 'Next'
            )}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Finalizing ────────────────────────────────────────────────────────────

  if (phase === 'finalizing') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Grading your answers...</p>
        </div>
      </div>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────────────────

  if (phase === 'result' && result) {
    const isPassed = result.status === 'PASS';
    const isPending = result.status === 'PENDING';
    const scorePercent = Math.round(parseFloat(result.score_percentage));
    const passingPct = parseFloat(assessment.passing_percentage);

    // Circumference for the score ring
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (scorePercent / 100) * circumference;

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-6 py-8">

            {/* Score ring */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-28 h-28 mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Track */}
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-100"
                  />
                  {/* Progress */}
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={cn(
                      'transition-all duration-700',
                      isPassed ? 'text-emerald-500' : isPending ? 'text-amber-400' : 'text-red-500'
                    )}
                  />
                </svg>
                {/* Score text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      isPassed ? 'text-emerald-600' : isPending ? 'text-amber-500' : 'text-red-500'
                    )}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {scorePercent}%
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold',
                  isPassed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isPending
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                )}
              >
                {isPassed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isPending ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {isPassed ? 'Passed' : isPending ? 'Pending Review' : 'Failed'}
              </div>

              <p className="text-sm text-gray-500 mt-2 text-center">
                {isPassed
                  ? 'Well done. You have successfully completed this quiz.'
                  : isPending
                  ? 'Your answers are being reviewed by an instructor.'
                  : `You needed ${passingPct}% to pass. Review the material and try again.`}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Total
                </p>
                <p className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-mono)' }}>
                  {result.total_questions}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Attempted
                </p>
                <p className="text-xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-mono)' }}>
                  {result.attempted_count}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Correct
                </p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    result.correct_count > 0 ? 'text-emerald-600' : 'text-gray-800'
                  )}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {result.correct_count}
                </p>
              </div>
            </div>

            {/* Passing score reference */}
            <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-1">
              <span>Your score: <span className="font-semibold text-gray-600">{scorePercent}%</span></span>
              <span>Passing score: <span className="font-semibold text-gray-600">{passingPct}%</span></span>
            </div>

            {/* Instructor feedback */}
            {result.instructor_feedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400 mb-1">
                  Instructor Feedback
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {result.instructor_feedback}
                </p>
              </div>
            )}

            {/* Actions */}
            {!isPassed && !isPending && assessment.attempts_remaining > 0 && (
              <button onClick={handleRetry} className="btn btn-secondary w-full">
                <RotateCcw className="h-4 w-4" />
                Try Again ({assessment.attempts_remaining} attempt{assessment.attempts_remaining !== 1 ? 's' : ''} remaining)
              </button>
            )}

            {!isPassed && !isPending && assessment.attempts_remaining === 0 && (
              <p className="text-center text-xs text-gray-400">
                No attempts remaining.
              </p>
            )}
          </div>
        </div>

        <LessonNavFooter lesson={lesson} nextLesson={nextLesson} isCompleted={isPassed} />
      </div>
    );
  }

  return null;
};

// ── Helper component ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md p-3 border',
        highlight
          ? 'bg-red-50 border-red-200'
          : 'bg-gray-50 border-gray-200'
      )}
    >
      <p className={cn(
        'text-[10px] font-semibold uppercase tracking-wide mb-0.5',
        highlight ? 'text-red-400' : 'text-gray-400'
      )}>
        {label}
      </p>
      <p className={cn(
        'text-sm font-semibold',
        highlight ? 'text-red-700' : 'text-gray-800'
      )}>
        {value}
      </p>
    </div>
  );
}
