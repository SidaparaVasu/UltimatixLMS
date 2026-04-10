import React from 'react';
import { Search, X } from 'lucide-react';

interface AdminActionBarProps {
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  resultCount?: number;       // shows "N results" when a search is active
  children?: React.ReactNode; // filter dropdowns, export btn, etc. on the right
}

export const AdminActionBar = ({
  searchPlaceholder = 'Search...',
  searchTerm = '',
  onSearchChange,
  resultCount,
  children,
}: AdminActionBarProps) => {
  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div
      className="anim delay-2"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}
    >
      {/* ── Left: search input ── */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 260px',
          maxWidth: '100%',
        }}
      >
        {/* Search icon */}
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '11px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: hasSearch ? 'var(--color-accent)' : 'var(--color-text-muted)',
            pointerEvents: 'none',
            transition: 'color 150ms ease',
          }}
        />

        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={e => onSearchChange?.(e.target.value)}
          className="form-input"
          style={{
            paddingLeft: '34px',
            paddingRight: hasSearch ? '34px' : 'var(--space-4)',
            height: '40px',
            fontSize: 'var(--text-sm)',
            width: '100%',
          }}
        />

        {/* Clear button — only visible when there's a query */}
        {hasSearch && (
          <button
            onClick={() => onSearchChange?.('')}
            title="Clear search"
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-alt)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-alt)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
            }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Result count — shown only during active search */}
      {hasSearch && resultCount !== undefined && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {resultCount === 0
            ? 'No results'
            : `${resultCount} result${resultCount === 1 ? '' : 's'}`}
        </span>
      )}

      {/* ── Right: action slot (filters, buttons, etc.) ── */}
      {children && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};