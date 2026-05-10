import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface DualTimerProps {
  overallSeconds: number;
  questionSeconds: number | null;  // null = no per-question limit
  questionNumber: number;
  totalQuestions: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * DualTimer — shows overall assessment countdown and per-question countdown
 * simultaneously in the assessment player top bar.
 */
export default function DualTimer({ overallSeconds, questionSeconds, questionNumber, totalQuestions }: DualTimerProps) {
  const overallUrgent  = overallSeconds <= 300;   // last 5 minutes
  const questionUrgent = questionSeconds !== null && questionSeconds <= 10;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      {/* Question progress */}
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)' }}>
        Question <strong style={{ color: 'var(--color-text-primary)' }}>{questionNumber}</strong> of {totalQuestions}
      </span>

      {/* Per-question timer */}
      {questionSeconds !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: 'var(--radius-md)',
          background: questionUrgent ? 'rgba(220,38,38,0.08)' : 'var(--color-surface-alt)',
          border: `1px solid ${questionUrgent ? 'rgba(220,38,38,0.3)' : 'var(--color-border)'}`,
        }}>
          {questionUrgent
            ? <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
            : <Clock size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          }
          <span style={{
            fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: questionUrgent ? '#dc2626' : 'var(--color-text-secondary)',
            minWidth: '42px', textAlign: 'center',
          }}>
            {formatTime(questionSeconds)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Q</span>
        </div>
      )}

      {/* Overall timer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 12px', borderRadius: 'var(--radius-md)',
        background: overallUrgent ? 'rgba(220,38,38,0.08)' : 'var(--color-surface-alt)',
        border: `1px solid ${overallUrgent ? 'rgba(220,38,38,0.3)' : 'var(--color-border)'}`,
      }}>
        <Clock size={13} style={{ color: overallUrgent ? '#dc2626' : 'var(--color-text-muted)', flexShrink: 0 }} />
        <span style={{
          fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: overallUrgent ? '#dc2626' : 'var(--color-text-primary)',
          minWidth: '52px', textAlign: 'center',
        }}>
          {formatTime(overallSeconds)}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Total</span>
      </div>
    </div>
  );
}
