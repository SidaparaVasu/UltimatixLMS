import React from 'react';

interface AdminToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: React.CSSProperties;
}

/**
 * AdminToggle — standardized status toggle row used at the bottom of every master form.
 * Renders a bordered row with a label, optional subtext, and a styled checkbox.
 *
 * Usage:
 *   <AdminToggle
 *     label="Active Status"
 *     hint="Inactive records are hidden from normal operations."
 *     checked={formData.isActive}
 *     onChange={v => setField('isActive', v)}
 *   />
 */
export const AdminToggle: React.FC<AdminToggleProps> = ({
  label,
  hint,
  checked,
  onChange,
  style,
}) => {
  return (
    <div
      className="form-group"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-4)',
        marginTop: 'var(--space-2)',
        ...style,
      }}
    >
      <div>
        <label
          className="form-label"
          style={{ display: 'block', color: 'var(--color-text-primary)' }}
        >
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            accentColor: 'var(--color-accent)',
            cursor: 'pointer',
          }}
        />
      </label>
    </div>
  );
};
