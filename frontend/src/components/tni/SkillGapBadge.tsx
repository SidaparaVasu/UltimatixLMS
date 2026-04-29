import React from 'react';
import { GapSeverity } from '@/types/tni.types';

interface SkillGapBadgeProps {
  severity: GapSeverity | null | undefined;
  /** Numeric gap value — shown alongside the severity label when provided */
  gapValue?: number | null;
  /** Compact mode — icon only, no text label */
  compact?: boolean;
  style?: React.CSSProperties;
}

const config: Record<GapSeverity, {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}> = {
  NONE: {
    label: 'Met',
    icon: '✓',
    color: '#15803d',
    bg: 'rgba(26,158,58,0.08)',
    border: 'rgba(26,158,58,0.25)',
  },
  MINOR: {
    label: 'Minor gap',
    icon: '▼',
    color: '#b45309',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.30)',
  },
  CRITICAL: {
    label: 'Critical gap',
    icon: '▼▼',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.25)',
  },
  NOT_RATED: {
    label: 'Not rated',
    icon: '—',
    color: 'var(--color-text-muted)',
    bg: 'var(--color-surface-alt)',
    border: 'var(--color-border)',
  },
};

/**
 * SkillGapBadge
 *
 * Displays a colour-coded pill indicating the gap between an employee's
 * current skill level and the level required by their job role.
 *
 * Severity mapping:
 *   NONE       — gap = 0  (green  ✓ Met)
 *   MINOR      — gap = 1  (amber  ▼ Minor gap)
 *   CRITICAL   — gap ≥ 2  (red    ▼▼ Critical gap)
 *   NOT_RATED  — no current level recorded
 */
export const SkillGapBadge: React.FC<SkillGapBadgeProps> = ({
  severity,
  gapValue,
  compact = false,
  style,
}) => {
  if (!severity) return null;

  const c = config[severity];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: compact ? '2px 6px' : '3px 10px',
        borderRadius: '999px',
        fontSize: compact ? '11px' : '12px',
        fontWeight: 600,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.01em',
        ...style,
      }}
      title={gapValue != null ? `Gap: ${gapValue} level${gapValue !== 1 ? 's' : ''}` : undefined}
    >
      <span style={{ fontSize: compact ? '9px' : '10px', lineHeight: 1 }}>
        {c.icon}
      </span>
      {!compact && <span>{c.label}</span>}
      {!compact && gapValue != null && gapValue > 0 && (
        <span style={{ opacity: 0.7, fontSize: '11px' }}>
          ({gapValue})
        </span>
      )}
    </span>
  );
};
