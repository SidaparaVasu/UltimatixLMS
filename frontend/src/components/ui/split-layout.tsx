import React from 'react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface SplitLayoutProps {
  /** Left (main) panel — 75% by default */
  main: React.ReactNode;
  /** Right (sidebar) panel — 25% by default */
  sidebar: React.ReactNode;
  /** Width of sidebar. Defaults to '25%'. Can be px or %. */
  sidebarWidth?: string;
  /** Gap between the two panels. Defaults to var(--space-6). */
  gap?: string;
  /** If true, sidebar is sticky within the viewport height. Defaults to true. */
  stickySection?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * SplitLayout — a generic two-column (main + sidebar) page layout.
 *
 * The sidebar is sticky by default: it stays visible while the main
 * panel scrolls. Designed for information-dense pages like the
 * Competency Master, where quick reference data lives on the right.
 *
 * Usage:
 *   <SplitLayout
 *     main={<SkillCategoryGrid />}
 *     sidebar={<SkillLevelPanel />}
 *     sidebarWidth="280px"
 *   />
 */
export const SplitLayout: React.FC<SplitLayoutProps> = ({
  main,
  sidebar,
  sidebarWidth = '25%',
  gap = 'var(--space-6)',
  stickySection = true,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap,
        width: '100%',
      }}
    >
      {/* ── Main panel ── */}
      <div style={{ flex: 1, minWidth: 0 }}>{main}</div>

      {/* ── Sidebar panel ── */}
      <div
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          ...(stickySection
            ? {
                position: 'sticky',
                top: 'calc(var(--topnav-h) + var(--space-4))',
                maxHeight: 'calc(100vh - var(--topnav-h) - var(--space-8))',
                overflowY: 'auto',
              }
            : {}),
        }}
      >
        {sidebar}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SIDEBAR CARD — thin wrapper for sidebar sections
───────────────────────────────────────────────────────────── */
interface SidebarCardProps {
  title: string;
  /** Small action rendered in the header-right slot (e.g., an InlineAdd trigger) */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * SidebarCard — a minimal card container for right-sidebar sections.
 * Provides a titled header and a padded content area.
 *
 * Usage:
 *   <SidebarCard title="Skill Levels" action={<InlineAdd ... />}>
 *     <SkillLevelList ... />
 *   </SidebarCard>
 */
export const SidebarCard: React.FC<SidebarCardProps> = ({ title, action, children }) => (
  <div
    style={{
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: 'var(--space-4)',
    }}
  >
    {/* Card header */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
        {title}
      </span>
      {action && <div>{action}</div>}
    </div>

    {/* Card body */}
    <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
      {children}
    </div>
  </div>
);
