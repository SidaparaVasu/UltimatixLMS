import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional subtitle shown below label in the dropdown */
  sub?: string;
  /** Whether option is disabled/un-selectable */
  disabled?: boolean;
}

interface ComboboxProps {
  /** Full list of available options */
  options: ComboboxOption[];
  /** Currently selected values */
  value: string[];
  /** Called when the selection changes */
  onChange: (values: string[]) => void;
  /** Placeholder text when nothing typed */
  placeholder?: string;
  /** If provided, shows "+ Create '{query}'" when no options match */
  onCreate?: (label: string) => void;
  /** Label for the create action, defaults to "Create" */
  createLabel?: string;
  /** Max items allowed (undefined = unlimited) */
  maxItems?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class for the container */
  className?: string;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * Combobox — multi-select search dropdown with optional inline-create.
 *
 * Selected items render as pill/badge inside the input area.
 * Dropdown opens below; click outside closes it.
 *
 * Usage:
 *   <Combobox
 *     options={skills.map(s => ({ value: s.id, label: s.name }))}
 *     value={selectedIds}
 *     onChange={setSelectedIds}
 *     onCreate={name => createSkillInline(name)}
 *     createLabel="Add Skill"
 *   />
 */
export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  onCreate,
  createLabel = 'Create',
  maxItems,
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isSelected = useCallback((v: string) => value.includes(v), [value]);
  const isMaxReached = maxItems !== undefined && value.length >= maxItems;

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase()) ||
    opt.sub?.toLowerCase().includes(query.toLowerCase())
  );

  const showCreate =
    onCreate &&
    query.trim().length > 0 &&
    !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase());

  const toggle = (optValue: string) => {
    if (isSelected(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else if (!isMaxReached) {
      onChange([...value, optValue]);
    }
  };

  const remove = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optValue));
  };

  const handleCreate = () => {
    const trimmed = query.trim();
    if (trimmed && onCreate) {
      onCreate(trimmed);
      setQuery('');
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* ── Input area (pills + search) ── */}
      <div
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px',
          minHeight: '36px',
          padding: '4px 8px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: disabled ? 'var(--color-surface-alt)' : 'var(--color-bg)',
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 150ms',
          ...(open ? { borderColor: 'var(--color-accent)', outline: '2px solid color-mix(in srgb, var(--color-accent) 20%, transparent)' } : {}),
        }}
      >
        {/* Pills for selected items */}
        {value.map(v => {
          const opt = options.find(o => o.value === v);
          return (
            <span
              key={v}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 6px 2px 8px', borderRadius: '999px',
                background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
                color: 'var(--color-accent)', fontSize: '12px', fontWeight: 500,
                lineHeight: 1.5, maxWidth: '180px',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {opt?.label ?? v}
              </span>
              {!disabled && (
                <button
                  onClick={e => remove(v, e)}
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.7, lineHeight: 1 }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              )}
            </span>
          );
        })}

        {/* Search input */}
        {!isMaxReached && (
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            style={{
              flex: 1, minWidth: '80px', border: 'none', outline: 'none',
              background: 'transparent', fontSize: '13px',
              color: 'var(--color-text-primary)', padding: '2px 0',
            }}
          />
        )}

        {/* Search icon */}
        <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 'auto' }} />
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000, maxHeight: '240px', overflowY: 'auto',
          }}
        >
          {filtered.length === 0 && !showCreate && (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              No matches found
            </div>
          )}

          {filtered.map(opt => {
            const selected = isSelected(opt.value);
            const blocked = !selected && isMaxReached;
            return (
              <div
                key={opt.value}
                onClick={() => !opt.disabled && !blocked && toggle(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', cursor: (opt.disabled || blocked) ? 'not-allowed' : 'pointer',
                  opacity: (opt.disabled || blocked) ? 0.5 : 1,
                  background: selected ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (!opt.disabled && !blocked) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-alt)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent'; }}
              >
                {/* Checkbox indicator */}
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  border: selected ? 'none' : '1.5px solid var(--color-border)',
                  background: selected ? 'var(--color-accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <Check size={10} strokeWidth={3} color="#fff" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: selected ? 600 : 400, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </div>
                  {opt.sub && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{opt.sub}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Inline create option */}
          {showCreate && (
            <div
              onClick={handleCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', cursor: 'pointer',
                borderTop: filtered.length > 0 ? '1px solid var(--color-border)' : 'none',
                color: 'var(--color-accent)', fontSize: '13px', fontWeight: 500,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-accent) 6%, transparent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Plus size={14} strokeWidth={2.5} />
              {createLabel} &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
};
