import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface TabSwitchWarningModalProps {
  violationCount: 1 | 2;
  onContinue: () => void;
}

/**
 * TabSwitchWarningModal — shown when the learner switches tabs during an active assessment.
 * Displayed for violation 1 and 2. On violation 3 the assessment auto-submits immediately.
 * Focus is trapped within the modal while open.
 */
export default function TabSwitchWarningModal({ violationCount, onContinue }: TabSwitchWarningModalProps) {
  const isFinal = violationCount === 2;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      // Prevent clicking outside to dismiss — learner must acknowledge
    >
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        border: `2px solid ${isFinal ? '#dc2626' : '#f59e0b'}`,
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-5)',
          background: isFinal ? 'rgba(220,38,38,0.06)' : 'rgba(245,158,11,0.06)',
          borderBottom: `1px solid ${isFinal ? 'rgba(220,38,38,0.2)' : 'rgba(245,158,11,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: isFinal ? 'rgba(220,38,38,0.12)' : 'rgba(245,158,11,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isFinal
              ? <ShieldAlert size={20} style={{ color: '#dc2626' }} />
              : <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            }
          </div>
          <div>
            <p style={{
              margin: 0, fontSize: '16px', fontWeight: 700,
              color: isFinal ? '#dc2626' : '#b45309',
            }}>
              Warning {violationCount}/3
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Tab switching detected
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5)' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {isFinal ? (
              <>
                <strong style={{ color: '#dc2626' }}>Final warning.</strong> You have left the assessment tab again.
                One more violation will <strong>automatically submit your assessment</strong> with your current answers.
              </>
            ) : (
              <>
                You left the assessment tab. Please stay on this tab for the duration of the assessment.
                Repeated violations will result in automatic submission.
              </>
            )}
          </p>

          {/* Violation indicator */}
          <div style={{
            display: 'flex', gap: '6px', marginTop: 'var(--space-4)',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '4px' }}>Violations:</span>
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                width: '28px', height: '8px', borderRadius: '4px',
                background: n <= violationCount
                  ? (isFinal ? '#dc2626' : '#f59e0b')
                  : 'var(--color-border)',
                transition: 'background 200ms',
              }} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onContinue}
            autoFocus
            style={{
              padding: '10px 24px', borderRadius: 'var(--radius-md)',
              border: 'none',
              background: isFinal ? '#dc2626' : 'var(--color-accent)',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
