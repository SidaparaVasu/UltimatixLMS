import React from 'react';

interface ProficiencyBadgeProps {
  level: string; // e.g. "L1", "Beginner", etc.
  rank?: number; // 1, 2, 3...
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A standardized badge for displaying skill proficiency levels.
 * Uses a color-coding system based on the rank.
 */
export const ProficiencyBadge: React.FC<ProficiencyBadgeProps> = ({ 
  level, 
  rank, 
  className,
  style 
}) => {
  // Determine color based on common rank logic (L1, L2, L3)
  const getColors = () => {
    switch (rank) {
      case 1:
        return {
          background: 'color-mix(in srgb, #94a3b8 10%, transparent)',
          border: '1px solid color-mix(in srgb, #94a3b8 30%, transparent)',
          color: '#64748b',
        };
      case 2:
        return {
          background: 'color-mix(in srgb, #eab308 10%, transparent)',
          border: '1px solid color-mix(in srgb, #eab308 30%, transparent)',
          color: '#ca8a04',
        };
      case 3:
        return {
          background: 'color-mix(in srgb, #3b82f6 10%, transparent)',
          border: '1px solid color-mix(in srgb, #3b82f6 30%, transparent)',
          color: '#2563eb',
        };
      default:
        return {
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
        };
    }
  };

  const colors = getColors();

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        ...colors,
        ...style
      }}
    >
      {level}
    </span>
  );
};
