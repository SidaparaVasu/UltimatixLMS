import React from 'react';
import { SkillLevelNested, RatingNested } from '@/types/tni.types';
import { ProficiencyBadge } from '@/components/ui/proficiency-badge';

interface SkillRatingRowProps {
  skillId: number;
  skillName: string;
  /** Required level from job role — null for extra (non-role) skills */
  requiredLevel: SkillLevelNested | null;
  /** All available levels to render as radio options */
  levels: SkillLevelNested[];
  /** Currently selected level ID (controlled) */
  selectedLevelId: number | null;
  /** Called when the user picks a level */
  onChange: (skillId: number, levelId: number) => void;
  /** When true the row is read-only (submitted state) */
  readOnly?: boolean;
  /** Optional: show the self-rated level as a reference column (manager view) */
  selfRating?: RatingNested | null;
  /** Highlight the row if the required skill has no rating yet */
  isMissing?: boolean;
}

/**
 * SkillRatingRow
 *
 * A single row in the TNI rating form. Renders:
 *   - Skill name (with "required" badge if mapped to job role)
 *   - Required level reference badge
 *   - Self-rated level reference (manager view only)
 *   - Radio-button level selector (or read-only display when submitted)
 */
export const SkillRatingRow: React.FC<SkillRatingRowProps> = ({
  skillId,
  skillName,
  requiredLevel,
  levels,
  selectedLevelId,
  onChange,
  readOnly = false,
  selfRating,
  isMissing = false,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: selfRating
          ? '1fr 120px 120px 1fr'   // manager view: name | required | self-rated | your assessment
          : '1fr 120px 1fr',        // employee view: name | required | your rating
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        background: isMissing
          ? 'rgba(220,38,38,0.03)'
          : 'transparent',
        transition: 'background 150ms',
      }}
    >
      {/* ── Skill name ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {skillName}
        </span>
        {isMissing && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#dc2626',
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.20)',
              borderRadius: '4px',
              padding: '1px 6px',
              flexShrink: 0,
            }}
          >
            Required
          </span>
        )}
      </div>

      {/* ── Required level badge ────────────────────────────────────── */}
      <div>
        {requiredLevel ? (
          <ProficiencyBadge
            level={requiredLevel.level_name}
            rank={requiredLevel.level_rank}
          />
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            —
          </span>
        )}
      </div>

      {/* ── Self-rated reference (manager view only) ────────────────── */}
      {selfRating !== undefined && (
        <div>
          {selfRating?.rated_level ? (
            <ProficiencyBadge
              level={selfRating.rated_level.level_name}
              rank={selfRating.rated_level.level_rank}
            />
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Not rated
            </span>
          )}
        </div>
      )}

      {/* ── Level selector ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          alignItems: 'center',
        }}
      >
        {readOnly ? (
          // Read-only: show selected level as a badge
          selectedLevelId ? (
            (() => {
              const selected = levels.find(l => l.id === selectedLevelId);
              return selected ? (
                <ProficiencyBadge level={selected.level_name} rank={selected.level_rank} />
              ) : null;
            })()
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Not rated
            </span>
          )
        ) : (
          // Editable: radio-button style level pills
          levels.map(level => {
            const isSelected = selectedLevelId === level.id;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onChange(skillId, level.id)}
                aria-pressed={isSelected}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  border: isSelected
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-border)',
                  background: isSelected
                    ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                    : 'var(--color-surface)',
                  color: isSelected
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {/* Radio dot */}
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: isSelected
                      ? '2px solid var(--color-accent)'
                      : '2px solid var(--color-border)',
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                    transition: 'all 150ms',
                  }}
                />
                {level.level_name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
