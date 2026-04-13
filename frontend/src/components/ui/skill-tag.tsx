import React from 'react';
import { Plus } from 'lucide-react';

interface SkillTagProps {
  name: string;
  isSubSkill?: boolean;
  onRemove?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A reusable pill component for displaying skills. 
 * Supports sub-skill indicators and an optional removal action.
 */
export const SkillTag: React.FC<SkillTagProps> = ({ 
  name, 
  isSubSkill, 
  onRemove,
  className,
  style
}) => {
  return (
    <li
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 500,
        background: isSubSkill
          ? 'var(--color-surface-alt)'
          : 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
        border: `1px solid ${isSubSkill ? 'var(--color-border)' : 'color-mix(in srgb, var(--color-accent) 25%, transparent)'}`,
        color: isSubSkill ? 'var(--color-text-muted)' : 'var(--color-accent)',
        listStyle: 'none',
        transition: 'all 150ms',
        ...style
      }}
    >
      {isSubSkill && <span style={{ opacity: 0.5 }}>↳</span>}
      <span>{name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.5,
            marginLeft: '2px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          aria-label={`Remove ${name}`}
        >
          <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
        </button>
      )}
    </li>
  );
};
