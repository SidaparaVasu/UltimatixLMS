import React from 'react';
import { CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { SubmissionReason } from '@/types/assessment-player.types';

interface AssessmentPlayerResultProps {
  assessmentTitle: string;
  submissionReason: SubmissionReason;
  onBack: () => void;
}

export default function AssessmentPlayerResult({
  assessmentTitle,
  submissionReason,
  onBack,
}: AssessmentPlayerResultProps) {
  const isViolation = submissionReason === 'violation';
  const isTimeout   = submissionReason === 'timeout';

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
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          {assessmentTitle}
        </span>
      </div>

      {/* Main content — two-column layout matching the player */}
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
              <AlertTriangle
                size={16}
                style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }}
              />
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#dc2626',
                lineHeight: 1.6,
              }}>
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
              <AlertTriangle
                size={16}
                style={{ color: '#b45309', flexShrink: 0, marginTop: '1px' }}
              />
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#b45309',
                lineHeight: 1.6,
              }}>
                Time's up. Your assessment was automatically submitted when the timer expired.
              </p>
            </div>
          )}

          {/* Success content */}
          <div style={{
            padding: 'var(--space-8) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 'var(--space-4)',
          }}>
            {/* Checkmark icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(22,163,74,0.10)',
              border: '2px solid rgba(22,163,74,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
            </div>

            <div>
              <h2 style={{
                margin: '0 0 var(--space-2)',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}>
                Assessment Submitted
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
                maxWidth: '320px',
              }}>
                Your result is being processed. You will be notified once it's ready.
              </p>
            </div>

            {/* Back button */}
            <button
              onClick={onBack}
              style={{
                marginTop: 'var(--space-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <ArrowLeft size={15} />
              Back to Assessments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
