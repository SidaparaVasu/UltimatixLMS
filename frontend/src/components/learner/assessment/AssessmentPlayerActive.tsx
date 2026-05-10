import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import DualTimer from './DualTimer';
import WatermarkOverlay from './WatermarkOverlay';
import CameraFeedPiP from './CameraFeedPiP';
import TabSwitchWarningModal from './TabSwitchWarningModal';
import OfflineOverlay from './OfflineOverlay';
import { NextQuestionResponse, SubmitAnswerPayload, PendingLocalAnswer } from '@/types/assessment-player.types';
import { assessmentPlayerApi } from '@/api/assessment-player-api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssessmentPlayerActiveProps {
  attemptId: string;
  assessmentTitle: string;
  initialQuestion: NextQuestionResponse;
  initialOverallSeconds: number;
  cameraStream: MediaStream | null;
  employeeName: string;
  employeeCode: string;
  onFinalize: (reason: 'normal' | 'timeout' | 'violation') => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssessmentPlayerActive({
  attemptId,
  assessmentTitle,
  initialQuestion,
  initialOverallSeconds,
  cameraStream,
  employeeName,
  employeeCode,
  onFinalize,
}: AssessmentPlayerActiveProps) {

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentQuestion, setCurrentQuestion] = useState<NextQuestionResponse>(initialQuestion);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [overallSeconds, setOverallSeconds] = useState(initialOverallSeconds);
  const [questionSeconds, setQuestionSeconds] = useState<number | null>(
    initialQuestion.time_limit_seconds > 0 ? initialQuestion.time_limit_seconds : null
  );
  const [violationCount, setViolationCount] = useState<0 | 1 | 2 | 3>(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const overallTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frozenOverall    = useRef(initialOverallSeconds);
  const frozenQuestion   = useRef<number | null>(
    initialQuestion.time_limit_seconds > 0 ? initialQuestion.time_limit_seconds : null
  );
  const lastViolationTs  = useRef<number>(0);
  const isFinalizing_ref = useRef(false);  // prevent double-finalize

  // ── Timer helpers ─────────────────────────────────────────────────────────

  const startOverallTimer = useCallback(() => {
    if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    overallTimerRef.current = setInterval(() => {
      setOverallSeconds(prev => {
        if (prev <= 1) {
          clearInterval(overallTimerRef.current!);
          if (!isFinalizing_ref.current) {
            isFinalizing_ref.current = true;
            handleFinalize('timeout');
          }
          return 0;
        }
        frozenOverall.current = prev - 1;
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startQuestionTimer = useCallback((seconds: number | null) => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (seconds === null) { setQuestionSeconds(null); return; }
    setQuestionSeconds(seconds);
    frozenQuestion.current = seconds;
    questionTimerRef.current = setInterval(() => {
      setQuestionSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(questionTimerRef.current!);
          // Auto-submit on question timeout
          handleAutoSubmitQuestion();
          return 0;
        }
        frozenQuestion.current = prev - 1;
        return prev - 1;
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start timers on mount
  useEffect(() => {
    startOverallTimer();
    startQuestionTimer(initialQuestion.time_limit_seconds > 0 ? initialQuestion.time_limit_seconds : null);
    return () => {
      if (overallTimerRef.current)  clearInterval(overallTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Offline handling ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      if (overallTimerRef.current)  clearInterval(overallTimerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      // Store current answer locally
      const pending: PendingLocalAnswer = {
        questionId: currentQuestion.question.id,
        selectedOptions,
        answerText,
      };
      localStorage.setItem(`asmt_pending_${attemptId}`, JSON.stringify(pending));
    };

    const handleOnline = async () => {
      setIsOffline(false);
      // Sync pending answer
      const raw = localStorage.getItem(`asmt_pending_${attemptId}`);
      if (raw) {
        try {
          const pending: PendingLocalAnswer = JSON.parse(raw);
          await assessmentPlayerApi.submitAnswer(attemptId, {
            question_id: pending.questionId,
            selected_options: pending.selectedOptions,
            answer_text: pending.answerText,
          });
          localStorage.removeItem(`asmt_pending_${attemptId}`);
          await loadNextQuestion();
        } catch {
          // If sync fails, resume timers anyway so learner can continue
        }
      }
      // Resume timers from frozen values
      startOverallTimer();
      startQuestionTimer(frozenQuestion.current);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [currentQuestion, selectedOptions, answerText, attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab-switch detection ──────────────────────────────────────────────────

  const recordViolation = useCallback(() => {
    const now = Date.now();
    if (now - lastViolationTs.current < 500) return; // deduplicate
    lastViolationTs.current = now;

    setViolationCount(prev => {
      const next = (prev + 1) as 0 | 1 | 2 | 3;
      if (next >= 3) {
        if (!isFinalizing_ref.current) {
          isFinalizing_ref.current = true;
          handleFinalize('violation');
        }
        return 3;
      }
      setShowViolationModal(true);
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') recordViolation();
    };
    const handleBlur = () => recordViolation();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [recordViolation]);

  // ── Back button prevention ────────────────────────────────────────────────

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Copy/paste prevention ─────────────────────────────────────────────────

  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('copy',  block);
    document.addEventListener('paste', block);
    document.addEventListener('cut',   block);
    return () => {
      document.removeEventListener('copy',  block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut',   block);
    };
  }, []);

  // ── Question loading ──────────────────────────────────────────────────────

  const loadNextQuestion = useCallback(async () => {
    const data = await assessmentPlayerApi.nextQuestion(attemptId);
    if (!data) return;
    if ('completed' in data && data.completed) {
      if (!isFinalizing_ref.current) {
        isFinalizing_ref.current = true;
        await handleFinalize('normal');
      }
      return;
    }
    const q = data as NextQuestionResponse;
    setCurrentQuestion(q);
    setSelectedOptions([]);
    setAnswerText('');
    startQuestionTimer(q.time_limit_seconds > 0 ? q.time_limit_seconds : null);
  }, [attemptId, startQuestionTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit handlers ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isFinalizing) return;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setIsSubmitting(true);
    try {
      await assessmentPlayerApi.submitAnswer(attemptId, {
        question_id: currentQuestion.question.id,
        selected_options: selectedOptions,
        answer_text: answerText,
      });
      await loadNextQuestion();
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, currentQuestion, selectedOptions, answerText, isSubmitting, isFinalizing, loadNextQuestion]);

  const handleAutoSubmitQuestion = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await assessmentPlayerApi.submitAnswer(attemptId, {
        question_id: currentQuestion.question.id,
        selected_options: selectedOptions,
        answer_text: answerText,
      });
      await loadNextQuestion();
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, currentQuestion, selectedOptions, answerText, isSubmitting, loadNextQuestion]);

  const handleFinalize = useCallback(async (reason: 'normal' | 'timeout' | 'violation') => {
    if (overallTimerRef.current)  clearInterval(overallTimerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setIsFinalizing(true);
    try {
      await assessmentPlayerApi.finalize(attemptId);
    } catch {
      // Finalize best-effort
    }
    onFinalize(reason);
  }, [attemptId, onFinalize]);

  // ── Option toggle ─────────────────────────────────────────────────────────

  const toggleOption = (optionId: number) => {
    const isMulti = currentQuestion.question.question_type === 'MSQ';
    if (isMulti) {
      setSelectedOptions(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  // ── Can submit ────────────────────────────────────────────────────────────

  const { question } = currentQuestion;
  const isTextAnswer = question.question_type === 'DESCRIPTIVE';
  const isScenario   = question.question_type === 'SCENARIO';
  const hasOptions   = question.options.length > 0;
  const showTextarea = isTextAnswer || (isScenario && !hasOptions);
  const showOptions  = !isTextAnswer && hasOptions;

  const canSubmit = showTextarea
    ? answerText.trim().length > 0
    : selectedOptions.length > 0;

  const progressPct = currentQuestion.total_questions > 0
    ? ((currentQuestion.question_number - 1) / currentQuestion.total_questions) * 100
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (isFinalizing) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-3)' }} />
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Submitting your assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg)',
      userSelect: 'none',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: 'var(--space-3) var(--space-6)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--space-4)',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', flexShrink: 0 }}>
          {assessmentTitle}
        </span>

        <DualTimer
          overallSeconds={overallSeconds}
          questionSeconds={questionSeconds}
          questionNumber={currentQuestion.question_number}
          totalQuestions={currentQuestion.total_questions}
        />
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: '3px', background: 'var(--color-border)' }}>
        <div style={{
          height: '100%', background: 'var(--color-accent)',
          width: `${progressPct}%`, transition: 'width 300ms ease',
        }} />
      </div>

      {/* ── Question body ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>

          {/* Question area with watermark */}
          <div style={{ position: 'relative' }}>
            <WatermarkOverlay employeeName={employeeName} employeeCode={employeeCode} />

            {/* Scenario */}
            {question.scenario_text && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-5)',
                fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.7,
              }}>
                <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent)' }}>
                  Scenario
                </p>
                {question.scenario_text}
              </div>
            )}

            {/* Question text */}
            <p style={{
              margin: '0 0 var(--space-2)',
              fontSize: '16px', fontWeight: 600,
              color: 'var(--color-text-primary)', lineHeight: 1.6,
            }}>
              {question.question_text}
            </p>

            <p style={{ margin: '0 0 var(--space-5)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {question.question_type === 'MSQ'
                ? 'Select all that apply'
                : showTextarea
                ? 'Type your answer below'
                : 'Select one answer'}
            </p>

            {/* Options */}
            {showOptions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {question.options.map((opt, idx) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  const label = String.fromCharCode(65 + idx);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(opt.id)}
                      style={{
                        width: '100%', textAlign: 'left',
                        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isSelected ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-surface)',
                        cursor: 'pointer', transition: 'all 150ms',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{
                        flexShrink: 0, width: '26px', height: '26px',
                        borderRadius: question.question_type === 'MSQ' ? '6px' : '50%',
                        border: `2px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isSelected ? 'var(--color-accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        color: isSelected ? '#fff' : 'var(--color-text-muted)',
                        transition: 'all 150ms',
                      }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize: '14px', lineHeight: 1.5,
                        color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        fontWeight: isSelected ? 500 : 400,
                        userSelect: 'none',
                      }}>
                        {opt.option_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Textarea */}
            {showTextarea && (
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                onCopy={e => e.preventDefault()}
                onPaste={e => e.preventDefault()}
                onCut={e => e.preventDefault()}
                placeholder={question.question_type === 'DESCRIPTIVE' ? 'Write your detailed answer here...' : 'Type your answer here...'}
                rows={question.question_type === 'DESCRIPTIVE' ? 8 : 5}
                style={{
                  width: '100%', padding: 'var(--space-3) var(--space-4)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px', color: 'var(--color-text-primary)',
                  lineHeight: 1.6, resize: 'vertical', minHeight: '120px',
                  outline: 'none', fontFamily: 'inherit',
                  userSelect: 'text', // allow typing but copy/paste blocked via events
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Submit footer ── */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: 'var(--space-4) var(--space-6)',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 'var(--space-3)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: 'auto' }}>
          {question.question_type === 'MSQ' ? 'Select all correct answers' : ''}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 24px', borderRadius: 'var(--radius-md)',
            border: 'none',
            background: canSubmit ? 'var(--color-accent)' : 'var(--color-border)',
            color: canSubmit ? '#fff' : 'var(--color-text-muted)',
            fontSize: '14px', fontWeight: 600,
            cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
            transition: 'all 150ms',
          }}
        >
          {isSubmitting
            ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
            : <>
                {currentQuestion.question_number === currentQuestion.total_questions ? 'Submit Assessment' : 'Next'}
                <ChevronRight size={16} />
              </>
          }
        </button>
      </div>

      {/* ── Overlays ── */}
      {showViolationModal && violationCount > 0 && violationCount < 3 && (
        <TabSwitchWarningModal
          violationCount={violationCount as 1 | 2}
          onContinue={() => setShowViolationModal(false)}
        />
      )}

      {isOffline && <OfflineOverlay />}

      <CameraFeedPiP stream={cameraStream} />
    </div>
  );
}
