import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft, Award, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCelebrationQueue } from '@/modules/gamification/context/CelebrationQueueProvider';
import { SubmissionReason } from '@/types/assessment-player.types';
import { assessmentPlayerApi } from '@/api/assessment-player-api';

interface AssessmentPlayerResultProps {
  assessmentTitle: string;
  attemptId: string | null;
  submissionReason: SubmissionReason;
  onBack: () => void;
}

type ResultStatus = 'PASS' | 'FAIL' | 'PENDING' | null;

export default function AssessmentPlayerResult({
  assessmentTitle,
  attemptId,
  submissionReason,
  onBack,
}: AssessmentPlayerResultProps) {
  const isViolation = submissionReason === 'violation';
  const isTimeout   = submissionReason === 'timeout';

  const [resultStatus, setResultStatus]         = useState<ResultStatus>(null);
  const [scorePercentage, setScorePercentage]   = useState<number | null>(null);
  const [loadingResult, setLoadingResult]       = useState(true);
  const { checkForCelebrations } = useCelebrationQueue();

  // Fetch the result — poll briefly since grading may be async
  useEffect(() => {
    if (!attemptId) {
      setLoadingResult(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_POLLS = 6;
    const POLL_INTERVAL_MS = 2000;

    const poll = async () => {
      if (cancelled) return;
      attempts++;

      const result = await assessmentPlayerApi.getResult(attemptId);
      if (cancelled) return;

      if (result && (result as any).status && (result as any).status !== 'PENDING') {
        setResultStatus((result as any).status as ResultStatus);
        setScorePercentage((result as any).score_percentage ?? null);
        setLoadingResult(false);
        return;
      }

      // Still PENDING — keep polling up to MAX_POLLS
      if (attempts < MAX_POLLS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        // Give up — show generic submitted state
        setResultStatus('PENDING');
        setLoadingResult(false);
      }
    };

    // Small initial delay to let the backend finish grading
    const timer = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attemptId]);

  useEffect(() => {
    if (loadingResult || resultStatus !== 'PASS') return;
    const timer = setTimeout(() => {
      void checkForCelebrations();
    }, 2000);
    return () => clearTimeout(timer);
  }, [loadingResult, resultStatus, checkForCelebrations]);

  // ── Result config ─────────────────────────────────────────────────────────
  const isPassed  = resultStatus === 'PASS';
  const isFailed  = resultStatus === 'FAIL';
  const isPending = resultStatus === 'PENDING' || resultStatus === null;

  const resultConfig = isPassed
    ? { icon: CheckCircle2, iconColor: '#16a34a', iconBg: 'rgba(22,163,74,0.10)', iconBorder: 'rgba(22,163,74,0.25)', heading: 'Congratulations!', subtext: 'You passed the assessment.' }
    : isFailed
    ? { icon: XCircle,      iconColor: '#dc2626', iconBg: 'rgba(220,38,38,0.08)', iconBorder: 'rgba(220,38,38,0.20)', heading: 'Assessment Complete', subtext: "You didn't meet the passing score this time." }
    : { icon: CheckCircle2, iconColor: '#2563eb', iconBg: 'rgba(37,99,235,0.08)', iconBorder: 'rgba(37,99,235,0.20)', heading: 'Assessment Submitted', subtext: 'Your result is being processed. You will be notified once it\'s ready.' };

  const ResultIcon = resultConfig.icon;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        padding: 'var(--space-4) var(--space-8)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {assessmentTitle}
        </span>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        margin: 'auto',
        width: '100%',
        padding: 'var(--space-8)',
        gap: 'var(--space-8)',
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '480px',
        }}>
          {/* Violation banner */}
          {isViolation && (
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              background: 'rgba(220,38,38,0.06)',
              borderBottom: '1px solid rgba(220,38,38,0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
            }}>
              <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', lineHeight: 1.6 }}>
                Your assessment was automatically submitted due to repeated tab switching violations.
              </p>
            </div>
          )}

          {/* Timeout banner */}
          {isTimeout && (
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              background: 'rgba(217,119,6,0.06)',
              borderBottom: '1px solid rgba(217,119,6,0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
            }}>
              <AlertTriangle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#b45309', lineHeight: 1.6 }}>
                Time's up. Your assessment was automatically submitted when the timer expired.
              </p>
            </div>
          )}

          {/* Result content */}
          <div style={{
            padding: 'var(--space-8) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 'var(--space-4)',
          }}>
            {/* Icon / spinner */}
            {loadingResult ? (
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(37,99,235,0.08)', border: '2px solid rgba(37,99,235,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader2 size={28} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: resultConfig.iconBg,
                border: `2px solid ${resultConfig.iconBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ResultIcon size={32} style={{ color: resultConfig.iconColor }} />
              </div>
            )}

            <div>
              <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {loadingResult ? 'Grading…' : resultConfig.heading}
              </h2>

              {/* Score */}
              {!loadingResult && scorePercentage !== null && !isPending && (
                <p style={{
                  margin: '0 0 var(--space-1)',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: isPassed ? '#16a34a' : '#dc2626',
                  lineHeight: 1.2,
                }}>
                  {Math.round(scorePercentage)}%
                </p>
              )}

              <p style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
                maxWidth: '320px',
              }}>
                {loadingResult ? 'Calculating your score…' : resultConfig.subtext}
              </p>
            </div>

            {/* Certificate CTA — only shown on PASS */}
            {!loadingResult && isPassed && (
              <div style={{
                width: '100%',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Award size={18} style={{ color: '#1e3a5f' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f', marginBottom: '2px' }}>
                    Certificate Issued
                  </div>
                  <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                    Your certificate is ready to download.
                  </div>
                </div>
                <Link
                  to="/my-certificates"
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#1e3a5f',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  View →
                </Link>
              </div>
            )}

            {/* Action buttons */}
            {!loadingResult && (
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: 'var(--space-2)' }}>
                <button
                  onClick={onBack}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: isPassed ? '1px solid var(--color-border)' : 'none',
                    background: isPassed ? 'var(--color-surface)' : 'var(--color-accent)',
                    color: isPassed ? 'var(--color-text-secondary)' : '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <ArrowLeft size={15} />
                  Back to Assessments
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
