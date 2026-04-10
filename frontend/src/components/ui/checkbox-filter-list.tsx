import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export interface CheckboxFilterOption {
  value: string;
  label: string;
  /** Optional count badge shown after label (e.g. number of skills in category) */
  count?: number;
}

interface CheckboxFilterListProps {
  /** All available options */
  options: CheckboxFilterOption[];
  /** Currently active (checked) values */
  value: string[];
  /** Called when selection changes */
  onChange: (values: string[]) => void;
  /** How many options to show before "Show more". Defaults to 10 */
  pageSize?: number;
  /** Label displayed above the list */
  label?: string;
  /** Text for the expand toggle. Defaults to "Show more" */
  showMoreLabel?: string;
  /** Text for the collapse toggle. Defaults to "Show less" */
  showLessLabel?: string;
  /** Whether to show a "Select all / Clear all" header action */
  showSelectAll?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * CheckboxFilterList — a progressive-disclosure checkbox list for sidebar filters.
 *
 * Shows the first `pageSize` options (default 10). A "Show +N more" link
 * reveals additional options, and "Show less" collapses them back.
 * Optionally shows a count badge beside each label.
 *
 * Usage:
 *   <CheckboxFilterList
 *     label="Filter by Skill"
 *     options={skills.map(s => ({ value: s.id, label: s.name, count: s.mappingCount }))}
 *     value={selectedSkills}
 *     onChange={setSelectedSkills}
 *     pageSize={10}
 *   />
 */
export const CheckboxFilterList: React.FC<CheckboxFilterListProps> = ({
  options,
  value,
  onChange,
  pageSize = 10,
  label,
  showMoreLabel = 'Show more',
  showLessLabel = 'Show less',
  showSelectAll = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? options : options.slice(0, pageSize);
  const hiddenCount = options.length - pageSize;

  const toggle = (optValue: string) => {
    onChange(
      value.includes(optValue)
        ? value.filter(v => v !== optValue)
        : [...value, optValue]
    );
  };

  const selectAll = () => onChange(options.map(o => o.value));
  const clearAll  = () => onChange([]);
  const allSelected = value.length === options.length && options.length > 0;

  return (
    <div>
      {/* Header row */}
      {(label || showSelectAll) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          {label && (
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
              {label}
            </span>
          )}
          {showSelectAll && (
            <button
              onClick={allSelected ? clearAll : selectAll}
              style={{ fontSize: '11px', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          )}
        </div>
      )}

      {/* Option rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visible.map(opt => {
          const checked = value.includes(opt.value);
          return (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 6px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', userSelect: 'none',
                background: checked ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-alt)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = checked ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent'; }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.value)}
                style={{ width: '14px', height: '14px', accentColor: 'var(--color-accent)', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', flex: 1, color: checked ? 'var(--color-accent)' : 'var(--color-text-primary)', fontWeight: checked ? 500 : 400 }}>
                {opt.label}
              </span>
              {opt.count !== undefined && (
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '1px 6px', borderRadius: '999px',
                  background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)',
                }}>
                  {opt.count}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Show more / less toggle */}
      {options.length > pageSize && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            marginTop: 'var(--space-2)', padding: '4px 6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: '12px', fontWeight: 500,
          }}
        >
          <ChevronDown
            size={13}
            strokeWidth={2.5}
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
          />
          {expanded ? showLessLabel : `${showMoreLabel} (+${hiddenCount})`}
        </button>
      )}
    </div>
  );
};
