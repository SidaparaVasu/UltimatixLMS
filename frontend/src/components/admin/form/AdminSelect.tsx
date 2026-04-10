import React from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

interface AdminSelectProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  style?: React.CSSProperties;
}

/**
 * AdminSelect — standardized dropdown wrapped in form-group + form-label.
 * Accepts a flat options array, handles placeholder option, and required asterisk.
 *
 * Usage:
 *   <AdminSelect
 *     label="Business Unit"
 *     required
 *     value={formData.buId}
 *     onChange={v => setField('buId', v)}
 *     options={businessUnits.map(b => ({ label: b.name, value: b.id }))}
 *   />
 */
export const AdminSelect: React.FC<AdminSelectProps> = ({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hint,
  style,
}) => {
  const effectivePlaceholder = placeholder ?? `Select ${label}...`;

  return (
    <div className="form-group" style={style}>
      <label className="form-label">
        {label}
        {required && <span className="input-requied"> *</span>}
      </label>
      <select
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', width: '100%' }}
      >
        <option value="" disabled>
          {effectivePlaceholder}
        </option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {hint}
        </span>
      )}
    </div>
  );
};
