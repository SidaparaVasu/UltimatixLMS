import React from 'react';
import { Plus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminActionBar } from '@/components/admin/AdminActionBar';
import { AdminFilterChips } from '@/components/admin/AdminFilterChips';

interface Breadcrumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface AdminMasterLayoutProps {
  // Header
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: Breadcrumb[];

  // Add button
  addLabel?: string;
  onAdd?: () => void;
  /** Replace the default Add button entirely */
  addAction?: React.ReactNode;

  // Search bar
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  resultCount?: number;

  /**
   * Additional filter controls rendered inside the ActionBar (right side).
   * Typically: <select> dropdowns for Status, BU, Dept, etc.
   */
  filterSlot?: React.ReactNode;

  /**
   * Active filter chips below the action bar.
   * Pass the same props you'd give to <AdminFilterChips />.
   */
  chips?: {
    activeFilters: [string, string][];
    onRemove: (key: string) => void;
    onClearAll: () => void;
    getLabel?: (key: string, val: string) => string;
    getKeyLabel?: (key: string) => string;
  };

  /** The table (and any dialogs/drawers) go here as children */
  children: React.ReactNode;
}

/**
 * AdminMasterLayout — top-level page wrapper for all admin master pages.
 * Stitches together: PageHeader + ActionBar + FilterChips + content slot.
 *
 * Usage:
 *   <AdminMasterLayout
 *     title="Business Units"
 *     description="Manage top-level divisions."
 *     breadcrumbs={[{ label: 'Admin' }, { label: 'Business Units' }]}
 *     addLabel="Add Business Unit"
 *     onAdd={() => crud.openDialog()}
 *     searchTerm={searchTerm}
 *     onSearchChange={setSearchTerm}
 *     resultCount={filteredData?.length}
 *     filterSlot={<StatusDropdown ... />}
 *   >
 *     <AdminDataTable ... />
 *     <Dialog ... />
 *   </AdminMasterLayout>
 */
export const AdminMasterLayout: React.FC<AdminMasterLayoutProps> = ({
  title,
  description,
  icon,
  breadcrumbs,
  addLabel,
  onAdd,
  addAction,
  searchPlaceholder,
  searchTerm = '',
  onSearchChange,
  resultCount,
  filterSlot,
  chips,
  children,
}) => {
  const defaultAddButton = onAdd && addLabel ? (
    <button
      onClick={onAdd}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        background: 'var(--color-accent)',
        color: '#fff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        transition: 'opacity 150ms ease',
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <Plus size={16} />
      {addLabel}
    </button>
  ) : null;

  return (
    <div className="content-inner">
      {/* ── Page Header ── */}
      <AdminPageHeader
        title={title}
        description={description}
        icon={icon}
        breadcrumbs={breadcrumbs}
        action={addAction ?? defaultAddButton ?? undefined}
      />

      {/* ── Action Bar (search + filters) ── */}
      {(onSearchChange || filterSlot) && (
        <AdminActionBar
          searchPlaceholder={searchPlaceholder ?? `Search ${title}...`}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          resultCount={resultCount}
        >
          {filterSlot}
        </AdminActionBar>
      )}

      {/* ── Active Filter Chips ── */}
      {chips && chips.activeFilters.length > 0 && (
        <AdminFilterChips
          activeFilters={chips.activeFilters}
          onRemove={chips.onRemove}
          onClearAll={chips.onClearAll}
          getLabel={chips.getLabel}
          getKeyLabel={chips.getKeyLabel}
        />
      )}

      {/* ── Main content (table + dialogs/drawers) ── */}
      {children}
    </div>
  );
};
