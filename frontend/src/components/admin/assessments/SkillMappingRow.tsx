import React from 'react';
import { Trash2 } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';

export interface SkillMappingFormRow {
  _key: string;
  id?: number;           // present for existing mappings
  skill: string;         // skill id as string (empty = not selected)
  skill_level: string;   // skill_level id as string (empty = not selected)
}

interface SkillMappingRowProps {
  row: SkillMappingFormRow;
  skillOptions: ComboboxOption[];
  skillLevelOptions: ComboboxOption[];
  onChange: (key: string, field: 'skill' | 'skill_level', value: string) => void;
  onRemove: (key: string) => void;
  isRemoving?: boolean;
}

export const SkillMappingRowItem: React.FC<SkillMappingRowProps> = ({
  row, skillOptions, skillLevelOptions, onChange, onRemove, isRemoving,
}) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: 'var(--space-3)',
    alignItems: 'end',
    padding: 'var(--space-3) var(--space-4)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  }}>
    {/* Skill selector */}
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" style={{ marginBottom: '4px' }}>
        Skill <span style={{ color: 'var(--color-danger)' }}>*</span>
      </label>
      <Combobox
        options={skillOptions}
        value={row.skill ? [row.skill] : []}
        onChange={vals => onChange(row._key, 'skill', vals[0] ?? '')}
        placeholder="Search skill..."
        maxItems={1}
      />
    </div>

    {/* Skill level selector */}
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" style={{ marginBottom: '4px' }}>
        Target Level <span style={{ color: 'var(--color-danger)' }}>*</span>
      </label>
      <Combobox
        options={skillLevelOptions}
        value={row.skill_level ? [row.skill_level] : []}
        onChange={vals => onChange(row._key, 'skill_level', vals[0] ?? '')}
        placeholder="Search level..."
        maxItems={1}
      />
    </div>

    {/* Remove button */}
    <button
      type="button"
      onClick={() => onRemove(row._key)}
      disabled={isRemoving}
      title="Remove skill mapping"
      style={{
        flexShrink: 0,
        width: '34px', height: '34px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: isRemoving ? 'not-allowed' : 'pointer',
        color: 'var(--color-text-muted)',
        transition: 'all 150ms',
        marginBottom: '1px',
      }}
      onMouseEnter={e => { if (!isRemoving) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-danger)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
    >
      <Trash2 size={14} />
    </button>
  </div>
);
