import React from 'react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface GridCardProps {
  /**
   * Card title / primary label (e.g. category name).
   * Rendered in the header.
   */
  title: string;
  /**
   * An optional subtitle or code shown below the title.
   */
  subtitle?: string;
  /**
   * Badge content placed in the top-right corner of the header.
   * Useful for counts, status tags, or icon buttons.
   */
  badge?: React.ReactNode;
  /**
   * Action slot in the card header (right side), e.g. "+ Add Skill" link.
   */
  headerAction?: React.ReactNode;
  /**
   * Main content area — skill chips, lists, custom rendering.
   */
  children: React.ReactNode;
  /**
   * Optional footer content (e.g. a summary row or secondary action).
   */
  footer?: React.ReactNode;
  /**
   * Optional accent colour for the left border stripe.
   * Defaults to var(--color-accent).
   */
  accentColor?: string;
  /**
   * Min height of the content area in px. Defaults to 80.
   */
  minContentHeight?: number;
  style?: React.CSSProperties;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * GridCard — a general-purpose titled card for grid layouts.
 *
 * Features an accented left border, header with title + action slot,
 * main content area, and optional footer. Designed to be composed inside
 * ResponsiveGrid for multi-column layouts.
 *
 * Usage:
 *   <GridCard
 *     title="Technical Skills"
 *     subtitle="TECH"
 *     badge={<span>12 skills</span>}
 *     headerAction={<button>+ Add Skill</button>}
 *   >
 *     <SkillList ... />
 *   </GridCard>
 */
export const GridCard: React.FC<GridCardProps> = ({
  title,
  subtitle,
  badge,
  headerAction,
  children,
  footer,
  accentColor = 'var(--color-accent)',
  minContentHeight = 80,
  style,
}) => (
  <div
    style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderLeft: `1px solid var(--color-border)`,
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      // overflow: 'hidden',
      transition: 'box-shadow 150ms',
      ...style,
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
  >
    {/* ── Header ── */}
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        borderTopLeftRadius: 'var(--radius-lg)',
        borderTopRightRadius: 'var(--radius-lg)',
        gap: 'var(--space-2)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: 'var(--color-text-primary)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        {badge && <div>{badge}</div>}
        {headerAction && <div>{headerAction}</div>}
      </div>
    </div>

    {/* ── Content ── */}
    <div style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', minHeight: `${minContentHeight}px` }}>
      {children}
    </div>

    {/* ── Footer (optional) ── */}
    {footer && (
      <div style={{
        padding: 'var(--space-2) var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        borderBottomLeftRadius: 'var(--radius-lg)',
        borderBottomRightRadius: 'var(--radius-lg)'
      }}>
        {footer}
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   RESPONSIVE GRID — wrapper for GridCard collections
───────────────────────────────────────────────────────────── */
interface ResponsiveGridProps {
  children: React.ReactNode;
  /**
   * Number of columns. Defaults to 3.
   * Pass an object for responsive: { sm: 1, md: 2, lg: 3 } (future enhancement).
   */
  columns?: number;
  /** Gap between cards. Defaults to var(--space-4). */
  gap?: string;
}

/**
 * ResponsiveGrid — a CSS-grid wrapper for GridCard components.
 *
 * Usage:
 *   <ResponsiveGrid columns={3}>
 *     {categories.map(cat => <GridCard key={cat.id} title={cat.name} ... />)}
 *   </ResponsiveGrid>
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = 3,
  gap = 'var(--space-4)',
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap,
      alignItems: 'start',
    }}
  >
    {children}
  </div>
);
