import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { assessmentCatalogApi } from '@/api/assessment-catalog-api';
import { assessmentPlayerApi } from '@/api/assessment-player-api';
import { CERTIFICATE_QUERY_KEYS } from '@/queries/admin/useCertificateQueries';

import AssessmentPlayerInstructions from '@/components/learner/assessment/AssessmentPlayerInstructions';
import AssessmentPlayerActive from '@/components/learner/assessment/AssessmentPlayerActive';
import AssessmentPlayerResult from '@/components/learner/assessment/AssessmentPlayerResult';

import { CatalogItem } from '@/types/assessment-catalog.types';
import { NextQuestionResponse, PlayerPhase, SubmissionReason } from '@/types/assessment-player.types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssessmentMeta {
  title: string;
  durationMinutes: number;
  questionCount: number;
  passingPercentage: string;
  negativeMarking: boolean;
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>{message}</p>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      flexDirection: 'column',
      gap: 'var(--space-4)',
    }}>
      <AlertCircle size={40} style={{ color: 'var(--color-danger, #dc2626)', opacity: 0.7 }} />
      <p style={{ fontSize: '15px', color: 'var(--color-text-primary)', fontWeight: 600, margin: 0 }}>
        Unable to load assessment
      </p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, maxWidth: '360px', textAlign: 'center' }}>
        {message}
      </p>
      <button
        onClick={onBack}
        style={{
          padding: '9px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Back to Assessments
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentPlayerPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const user             = useAuthStore(s => s.user);

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase]                       = useState<'loading' | PlayerPhase>('loading');
  const [loadError, setLoadError]               = useState<string | null>(null);
  const [meta, setMeta]                         = useState<AssessmentMeta | null>(null);
  const [attemptId, setAttemptId]               = useState<string | null>(null);
  const [initialQuestion, setInitialQuestion]   = useState<NextQuestionResponse | null>(null);
  const [initialOverallSecs, setInitialOverallSecs] = useState<number>(0);
  const [submissionReason, setSubmissionReason] = useState<SubmissionReason>('normal');
  const [cameraStream, setCameraStream]         = useState<MediaStream | null>(null);
  const [catalogItem, setCatalogItem]           = useState<CatalogItem | null>(null);

  // Ref holds the stream synchronously so the active phase render always
  // gets the live MediaStream on the very first render, before the
  // setCameraStream state update has flushed.
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Resume data — when ?attempt exists, we store resume info but still
  // show instructions (for camera/mic permissions). After "Begin" is clicked,
  // we skip startAttempt and use this stored data.
  const resumeDataRef = useRef<{
    attemptId: string;
    question: NextQuestionResponse;
    remainingSecs: number;
  } | null>(null);

  // ── Derived employee info for watermark ──────────────────────────────────
  const employeeName = user
    ? [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ') || user.username
    : '';
  const employeeCode = user?.email ?? '';

  // ── "Back to Assessments" handler ─────────────────────────────────────────
  const handleBack = useCallback(() => {
    // Stop camera stream — check both ref and state to cover all phases
    const stream = activeStreamRef.current ?? cameraStream;
    stream?.getTracks().forEach(t => t.stop());
    if (window.opener) {
      window.close();
    } else {
      navigate('/assessments');
    }
  }, [cameraStream, navigate]);

  // ── Page load — fetch metadata + optionally resume ────────────────────────
  useEffect(() => {
    if (!assessmentId) {
      setLoadError('No assessment ID provided.');
      return;
    }

    const numericId = parseInt(assessmentId, 10);
    const existingAttemptId = searchParams.get('attempt');

    (async () => {
      // 1. Fetch assessment metadata from the learner-facing catalog detail endpoint
      const catalogResult = await assessmentCatalogApi.getDetail(numericId);
      if (!catalogResult) {
        setLoadError('Assessment not found or no longer available.');
        return;
      }

      const item = catalogResult as CatalogItem;
      setCatalogItem(item);
      setMeta({
        title:             item.title,
        durationMinutes:   item.duration_minutes,
        questionCount:     item.number_of_questions,
        passingPercentage: item.passing_percentage,
        negativeMarking:   item.negative_marking_enabled,
      });

      // 2. If an attempt ID was passed in the URL, call resume
      if (existingAttemptId) {
        const resumeResult = await assessmentPlayerApi.resume(existingAttemptId);
        if (!resumeResult) {
          setLoadError('Could not resume this attempt. It may have expired.');
          return;
        }

        if (resumeResult.finalized) {
          // Attempt already completed — go straight to result, no instructions
          setAttemptId(existingAttemptId);
          setSubmissionReason('normal');
          setPhase('result');
          return;
        }

        if (resumeResult.next_question) {
          // Active attempt — store resume data, then show instructions so the
          // learner can grant camera/mic permissions before continuing.
          resumeDataRef.current = {
            attemptId:     existingAttemptId,
            question:      resumeResult.next_question,
            remainingSecs: resumeResult.remaining_seconds,
          };
          setPhase('instructions');
          return;
        }

        // next_question is null but not finalized — edge case, treat as done
        setAttemptId(existingAttemptId);
        setSubmissionReason('normal');
        setPhase('result');
        return;
      }

      // 3. No existing attempt — guard against starting when not allowed
      // Bug fix: if the learner already passed or has no attempts left,
      // block the instructions screen so they cannot start a new attempt.
      if (item.last_result_status === 'PASS') {
        setLoadError('You have already passed this assessment.');
        return;
      }
      if (item.attempts_remaining <= 0 && !item.active_attempt_id) {
        setLoadError('You have no attempts remaining for this assessment.');
        return;
      }

      // 4. Fresh start — show instructions
      setPhase('instructions');
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Instructions → Active transition ─────────────────────────────────────
  const handleBegin = useCallback(async (stream: MediaStream) => {
    if (!assessmentId || !meta) return;

    setCameraStream(stream);
    activeStreamRef.current = stream;

    // ── Resume path: attempt already exists, skip startAttempt ───────────
    if (resumeDataRef.current) {
      const { attemptId: resumeId, question, remainingSecs } = resumeDataRef.current;
      setAttemptId(resumeId);
      setInitialQuestion(question);
      setInitialOverallSecs(remainingSecs);
      setPhase('active');
      return;
    }

    // ── Fresh start path: create a new attempt ────────────────────────────
    const numericId = parseInt(assessmentId, 10);

    const startResult = await assessmentCatalogApi.startAttempt({ assessment_id: numericId });
    if (!startResult) return;

    const newAttemptId = (startResult as any).id as string;
    setAttemptId(newAttemptId);

    const firstQ = await assessmentPlayerApi.nextQuestion(newAttemptId);
    if (!firstQ || ('completed' in firstQ && firstQ.completed)) {
      await assessmentPlayerApi.finalize(newAttemptId);
      setSubmissionReason('normal');
      setPhase('result');
      return;
    }

    setInitialQuestion(firstQ as NextQuestionResponse);
    setInitialOverallSecs(meta.durationMinutes * 60);
    setPhase('active');
  }, [assessmentId, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Active → Result transition ────────────────────────────────────────────
  // Invalidate My Certificates when the attempt is finalized — the backend
  // issues a certificate on PASS, so we ensure the list refreshes without
  // requiring a manual page reload (Requirement 12.2)
  const queryClient = useQueryClient();
  const handleFinalize = useCallback((reason: SubmissionReason) => {
    setSubmissionReason(reason);
    setPhase('result');
    queryClient.invalidateQueries({
      queryKey: CERTIFICATE_QUERY_KEYS.myCertificates.list(),
    });
  }, [queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────

  // Error takes priority over all phases
  if (loadError) {
    return <ErrorScreen message={loadError} onBack={handleBack} />;
  }

  if (phase === 'loading') {
    return <LoadingScreen message="Loading assessment..." />;
  }

  if (!meta) {
    return <LoadingScreen message="Loading assessment..." />;
  }

  if (phase === 'instructions') {
    return (
      <AssessmentPlayerInstructions
        assessmentTitle={meta.title}
        durationMinutes={meta.durationMinutes}
        questionCount={meta.questionCount}
        passingPercentage={meta.passingPercentage}
        negativeMarking={meta.negativeMarking}
        isResuming={resumeDataRef.current !== null}
        onBegin={handleBegin}
      />
    );
  }

  if (phase === 'active' && attemptId && initialQuestion) {
    return (
      <AssessmentPlayerActive
        attemptId={attemptId}
        assessmentTitle={meta.title}
        initialQuestion={initialQuestion}
        initialOverallSeconds={initialOverallSecs}
        cameraStream={activeStreamRef.current}
        employeeName={employeeName}
        employeeCode={employeeCode}
        onFinalize={handleFinalize}
      />
    );
  }

  if (phase === 'result') {
    return (
      <AssessmentPlayerResult
        assessmentTitle={meta.title}
        attemptId={attemptId}
        submissionReason={submissionReason}
        onBack={handleBack}
      />
    );
  }

  // Fallback — should not be reached
  return <LoadingScreen message="Loading assessment..." />;
}
