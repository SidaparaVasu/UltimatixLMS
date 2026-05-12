import React from 'react';

/* ─────────────────────────────────────────────────────────────
   RESPONSIVE STYLES
   Below 1024px the layout stacks vertically: sidebar moves
   below the main panel, loses its sticky positioning, and
   expands to full width so nothing overlaps on small screens.
───────────────────────────────────────────────────────────── */
const SPLIT_LAYOUT_STYLES = `
  .split-layout {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }
  .split-layout__main {
    flex: 1;
    min-width: 0;
  }
  .split-layout__sidebar {
    flex-shrink: 0;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .split-layout__sidebar--sticky {
    position: sticky;
    top: calc(var(--topnav-h, 60px) + var(--space-4, 16px));
    max-height: calc(100vh - var(--topnav-h, 60px) - var(--space-8, 32px));
    overflow-y: auto;
  }
  @media (max-width: 1370px) {
    .split-layout {
      flex-direction: column;
    }
    .split-layout__main {
      width: 100%;
    }
    .split-layout__sidebar {
      width: 100% !important;
      position: static !important;
      max-height: none !important;
      margin-top: var(--space-6, 24px);
    }
  }
`;

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
 * Below 1024px the layout automatically stacks vertically so the
 * sidebar never overlaps the main content on small screens.
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
    <>
      <style>{SPLIT_LAYOUT_STYLES}</style>
      <div className="split-layout" style={{ gap }}>
        {/* ── Main panel ── */}
        <div className="split-layout__main">{main}</div>

        {/* ── Sidebar panel ── */}
        <div
          className={`split-layout__sidebar${stickySection ? ' split-layout__sidebar--sticky' : ''}`}
          style={{ width: sidebarWidth }}
        >
          {sidebar}
        </div>
      </div>
    </>
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
