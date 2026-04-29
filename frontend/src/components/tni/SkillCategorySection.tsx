import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SkillRatingRow } from './SkillRatingRow';
import { SkillLevelNested, RatingNested } from '@/types/tni.types';

export interface SkillRowData {
  skillId: number;
  skillName: string;
  requiredLevel: SkillLevelNested | null;
  selectedLevelId: number | null;
  selfRating?: RatingNested | null;
  isMissing?: boolean;
}

interface SkillCategorySectionProps {
  categoryName: string;
  skills: SkillRowData[];
  levels: SkillLevelNested[];
  onLevelChange: (skillId: number, levelId: number) => void;
  readOnly?: boolean;
  /** When true, show the self-rated column (manager view) */
  showSelfRating?: boolean;
  /** Start collapsed — defaults to expanded */
  defaultCollapsed?: boolean;
}

/**
 * SkillCategorySection
 *
 * A collapsible section grouping all skills under one category.
 * Renders a header row with the category name and skill count,
 * then a list of SkillRatingRow components.
 *
 * Used in both SelfTNIRatingPage and ManagerTNIRatingPage.
 */
export const SkillCategorySection: React.FC<SkillCategorySectionProps> = ({
  categoryName,
  skills,
  levels,
  onLevelChange,
  readOnly = false,
  showSelfRating = false,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const missingCount = skills.filter(s => s.isMissing && !s.selectedLevelId).length;

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 'var(--space-4)',
        background: 'var(--color-surface)',
      }}
    >
      {/* ── Category header ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-alt)',
          border: 'none',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 150ms',
        }}
        onMouseEnter={e =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'var(--color-canvas)')
        }
        onMouseLeave={e =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            'var(--color-surface-alt)')
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {collapsed ? (
            <ChevronRight size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          ) : (
            <ChevronDown size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          )}
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '0.01em',
            }}
          >
            {categoryName}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              padding: '1px 8px',
            }}
          >
            {skills.length} skill{skills.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Missing skills warning badge */}
        {missingCount > 0 && !readOnly && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#dc2626',
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.20)',
              borderRadius: '999px',
              padding: '2px 8px',
            }}
          >
            {missingCount} unrated
          </span>
        )}
      </button>

      {/* ── Column headers (only when expanded) ─────────────────────── */}
      {!collapsed && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: showSelfRating
                ? '1fr 120px 120px 1fr'
                : '1fr 120px 1fr',
              gap: 'var(--space-4)',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {(['Skill', 'Required Level', ...(showSelfRating ? ['Self-Rated'] : []), readOnly ? 'Rated Level' : 'Your Rating'] as string[]).map(
              (col, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {col}
                </span>
              )
            )}
          </div>

          {/* ── Skill rows ─────────────────────────────────────────────── */}
          {skills.map(skill => (
            <SkillRatingRow
              key={skill.skillId}
              skillId={skill.skillId}
              skillName={skill.skillName}
              requiredLevel={skill.requiredLevel}
              levels={levels}
              selectedLevelId={skill.selectedLevelId}
              onChange={onLevelChange}
              readOnly={readOnly}
              selfRating={showSelfRating ? skill.selfRating : undefined}
              isMissing={skill.isMissing && !skill.selectedLevelId}
            />
          ))}
        </>
      )}
    </div>
  );
};
