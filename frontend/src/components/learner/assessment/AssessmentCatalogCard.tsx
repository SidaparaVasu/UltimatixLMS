import React, { useState } from 'react';
import {
  Clock, CheckCircle, XCircle, Timer, Target,
  BookOpen, RotateCcw, AlertCircle, Play,
} from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CatalogItem } from '@/types/assessment-catalog.types';

interface AssessmentCatalogCardProps {
  item: CatalogItem;
  onStart: (item: CatalogItem) => void;
  onResume: (item: CatalogItem) => void;
  isStarting: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function AssessmentCatalogCard({ item, onStart, onResume, isStarting }: AssessmentCatalogCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const hasPassed    = item.last_result_status === 'PASS';
  const hasFailed    = item.last_result_status === 'FAIL';
  const isPending    = item.last_result_status === 'PENDING';
  const hasAttempted = item.attempts_used > 0;
  const inCooldown   = item.cooldown_remaining_hours > 0;
  const noAttempts   = item.attempts_remaining === 0 && !hasPassed;
  const hasActive    = !!item.active_attempt_id;

  // Determine button state — resume takes priority over all other states
  const getButtonState = () => {
    if (hasActive)    return { label: 'Resume', disabled: false, variant: 'resume' as const };
    if (hasPassed)    return { label: 'Completed', disabled: true, variant: 'success' as const };
    if (isPending)    return { label: 'Result Pending', disabled: true, variant: 'pending' as const };
    if (noAttempts)   return { label: 'No Attempts Left', disabled: true, variant: 'disabled' as const };
    if (inCooldown)   return { label: `Retake in ${item.cooldown_remaining_hours}h`, disabled: true, variant: 'cooldown' as const };
    if (hasAttempted) return { label: 'Retake', disabled: false, variant: 'retake' as const };
    return { label: 'Start Assessment', disabled: false, variant: 'start' as const };
  };

  const btn = getButtonState();

  const buttonStyles: Record<string, React.CSSProperties> = {
    start:    { background: 'var(--color-accent)', color: '#fff', border: 'none' },
    resume:   { background: 'var(--color-accent)', color: '#fff', border: 'none' },
    retake:   { background: 'transparent', color: 'var(--color-accent)', border: '1.5px solid var(--color-accent)' },
    success:  { background: 'rgba(22,163,74,0.10)', color: '#15803d', border: '1px solid rgba(22,163,74,0.3)', cursor: 'default' },
    pending:  { background: 'rgba(217,119,6,0.10)', color: '#b45309', border: '1px solid rgba(217,119,6,0.3)', cursor: 'default' },
    cooldown: { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'not-allowed' },
    disabled: { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'not-allowed' },
  };

  const handleButtonClick = () => {
    if (btn.disabled) return;
    // Resume bypasses the confirmation dialog — open directly
    if (btn.variant === 'resume') {
      onResume(item);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onStart(item);
  };

  return (
    <>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 150ms',
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
      >
        {/* Header */}
        <div style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ margin: '0 0 var(--space-1)', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
            {item.title}
          </h3>
          {item.description && (
            <p style={{
              margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Skill tags */}
        {item.skill_mappings.length > 0 && (
          <div style={{ padding: '0 var(--space-4) var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {item.skill_mappings.map((m, i) => (
              <span key={i} style={{
                padding: '2px 8px', borderRadius: '999px',
                fontSize: '10px', fontWeight: 600,
                background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                color: 'var(--color-accent)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
              }}>
                {m.skill_name} · {m.skill_level_name}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--color-border)',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-2)',
        }}>
          <StatItem icon={<BookOpen size={12} />} label="Questions" value={String(item.number_of_questions)} />
          <StatItem icon={<Timer size={12} />} label="Duration" value={`${item.duration_minutes}m`} />
          <StatItem icon={<Target size={12} />} label="Pass" value={`${parseFloat(item.passing_percentage)}%`} />
        </div>

        {/* Attempt history */}
        {hasAttempted && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
          }}>
            <p style={{ margin: '0 0 var(--space-2)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
              Attempt History
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Show last result status as a summary row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {item.attempts_used} of {item.retake_limit} attempt{item.retake_limit !== 1 ? 's' : ''} used
                </span>
                {item.last_result_status && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    fontSize: '11px', fontWeight: 600,
                    color: item.last_result_status === 'PASS' ? '#15803d'
                         : item.last_result_status === 'FAIL' ? '#dc2626'
                         : '#b45309',
                  }}>
                    {item.last_result_status === 'PASS' && <CheckCircle size={11} />}
                    {item.last_result_status === 'FAIL' && <XCircle size={11} />}
                    {item.last_result_status === 'PENDING' && <Clock size={11} />}
                    {item.last_result_status === 'PASS' ? 'Passed'
                     : item.last_result_status === 'FAIL' ? 'Failed'
                     : 'Pending Review'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Negative marking notice */}
        {item.negative_marking_enabled && (
          <div style={{
            padding: 'var(--space-2) var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(217,119,6,0.05)',
          }}>
            <AlertCircle size={12} style={{ color: '#b45309', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#b45309' }}>Negative marking enabled</span>
          </div>
        )}

        {/* Action button */}
        <div style={{ padding: 'var(--space-3) var(--space-4)', marginTop: 'auto' }}>
          <button
            onClick={handleButtonClick}
            disabled={btn.disabled}
            style={{
              width: '100%',
              padding: '9px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px', fontWeight: 600,
              cursor: btn.disabled ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'opacity 150ms',
              ...buttonStyles[btn.variant],
            }}
          >
            <>
              {btn.variant === 'resume'  && <Play size={13} />}
              {btn.variant === 'retake'  && <RotateCcw size={13} />}
              {btn.variant === 'success' && <CheckCircle size={13} />}
              {btn.label}
            </>
          </button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title={hasAttempted ? 'Retake Assessment' : 'Start Assessment'}
        description={`You are about to ${hasAttempted ? 'retake' : 'start'} "${item.title}". This will open in a new tab. Make sure you have ${item.duration_minutes} minutes available. You will need ${parseFloat(item.passing_percentage)}% to pass.`}
        confirmLabel={hasAttempted ? 'Retake' : 'Start'}
        variant="primary"
      />
    </>
  );
}

// ── Stat item ─────────────────────────────────────────────────────────────────

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-text-muted)' }}>
        {icon}
        <span style={{ fontSize: '10px', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

export default AssessmentCatalogCard;
