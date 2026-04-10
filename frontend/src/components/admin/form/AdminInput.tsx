import React from 'react';

interface AdminInputProps {
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'date' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  autoComplete?: string;
  style?: React.CSSProperties;
}

/**
 * AdminInput — standard controlled text input wrapped in form-group + form-label.
 * Handles required asterisk, disabled state, and optional hint text automatically.
 *
 * Usage:
 *   <AdminInput label="Unit Name" required value={...} onChange={v => setField('name', v)} />
 */
export const AdminInput: React.FC<AdminInputProps> = ({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  hint,
  autoComplete,
  style,
}) => {
  return (
    <div className="form-group" style={style}>
      <label className="form-label">
        {label}
        {required && <span className="input-requied"> *</span>}
      </label>
      <input
        type={type}
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{ width: '100%' }}
      />
      {hint && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {hint}
        </span>
      )}
    </div>
  );
};
