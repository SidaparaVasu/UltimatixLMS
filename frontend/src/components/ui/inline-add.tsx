import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface InlineAddProps {
  /**
   * Trigger element — the text/button that opens the tooltip input.
   * Receives `onClick` and `isOpen` as render props.
   */
  trigger: (props: { onClick: () => void; isOpen: boolean }) => React.ReactNode;
  /** Placeholder text inside the inline input */
  placeholder?: string;
  /** Called with the entered value when user submits */
  onSubmit: (value: string) => void;
  /** Tooltip position relative to trigger. Defaults to 'bottom-start'. */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  /** Width of the inline tooltip input. Defaults to 260px. */
  width?: number | string;
  /** Optional validation — return an error string or null */
  validate?: (value: string) => string | null;
  /** Label for the submit button. Defaults to "+". */
  submitLabel?: string;
  /** Whether to clear value after successful submit. Defaults to true. */
  clearOnSubmit?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * InlineAdd — a lightweight "click-to-reveal" popover input.
 *
 * Used wherever a quick-add action is needed without opening
 * a full dialog. Examples: "+ Add Skill Category", "+ Add Skill Level".
 *
 * Usage:
 *   <InlineAdd
 *     trigger={({ onClick, isOpen }) => (
 *       <button onClick={onClick} className="link-action">
 *         + Add Category
 *       </button>
 *     )}
 *     placeholder="Category name..."
 *     onSubmit={name => createCategory(name)}
 *   />
 */
export const InlineAdd: React.FC<InlineAddProps> = ({
  trigger,
  placeholder = 'Enter a name…',
  onSubmit,
  placement = 'bottom-start',
  width = 260,
  validate,
  submitLabel = '+',
  clearOnSubmit = true,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-focus when opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setValue(''); setError(null); }
  }, [open]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (validate) {
      const err = validate(trimmed);
      if (err) { setError(err); return; }
    }
    onSubmit(trimmed);
    if (clearOnSubmit) setValue('');
    setError(null);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') setOpen(false);
  };

  /* Placement → CSS positioning helpers */
  const placementStyle: React.CSSProperties = (() => {
    switch (placement) {
      case 'bottom-end': return { top: 'calc(100% + 6px)', right: 0 };
      case 'top-start':  return { bottom: 'calc(100% + 6px)', left: 0 };
      case 'top-end':    return { bottom: 'calc(100% + 6px)', right: 0 };
      default:           return { top: 'calc(100% + 6px)', left: 0 };
    }
  })();

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger element */}
      {trigger({ onClick: () => setOpen(o => !o), isOpen: open })}

      {/* Popover input */}
      {open && (
        <div
          style={{
            position: 'absolute',
            ...placementStyle,
            width,
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            padding: '10px',
            zIndex: 1100,
          }}
        >
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={value}
              onChange={e => { setValue(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{
                flex: 1, padding: '6px 10px', fontSize: '13px',
                border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)', outline: 'none',
                background: 'var(--color-bg)', color: 'var(--color-text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)')}
            />
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              title="Submit"
              style={{
                width: '30px', height: '30px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: value.trim() ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                color: value.trim() ? '#fff' : 'var(--color-text-muted)',
                cursor: value.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '18px', fontWeight: 600, transition: 'all 150ms',
              }}
            >
              {submitLabel === '+' ? <Plus size={16} strokeWidth={2.5} /> : submitLabel}
            </button>
            <button
              onClick={() => setOpen(false)}
              title="Cancel"
              style={{
                width: '30px', height: '30px', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: 'var(--color-text-muted)', transition: 'all 150ms',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {error && (
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
