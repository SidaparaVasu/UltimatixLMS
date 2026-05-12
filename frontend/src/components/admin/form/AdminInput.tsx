import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
 * Password fields automatically get a show/hide toggle button.
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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="form-group" style={style}>
      <label className="form-label">
        {label}
        {required && <span className="input-requied"> *</span>}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type={resolvedType}
          className="form-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          style={{ width: '100%', paddingRight: isPassword ? '36px' : undefined }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {hint}
        </span>
      )}
    </div>
  );
};
