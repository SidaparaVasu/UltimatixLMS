import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableStatusBadge,
  TableActionCell,
  TableIconButton,
  TableIdCell,
  TableProfileCell,
} from '@/components/ui/table';
import { AdminTableSkeleton } from '@/components/admin/AdminTableSkeleton';
import { AdminPagination } from '@/components/ui/pagination';

/* ────────────────────────────────────────────────
   Column type definitions
──────────────────────────────────────────────── */

type BaseColumn<T> = {
  header?: string;
  /** Width style for the <th>, e.g. '120px', '20%' */
  width?: string;
  /** Inline style override for each rendered <td> */
  cellStyle?: React.CSSProperties;
};

/** Plain text value from a key */
type TextColumn<T> = BaseColumn<T> & {
  type: 'text';
  key: keyof T;
};

/** Monospace code/ID badge */
type IdColumn<T> = BaseColumn<T> & {
  type: 'id';
  key: keyof T;
};

/** Name + optional sub-line — uses built-in TableProfileCell */
type ProfileColumn<T> = BaseColumn<T> & {
  type: 'profile';
  key: keyof T;       // primary name field
  subKey?: keyof T;   // secondary sub-line field (e.g. email)
};

/** Boolean → Active/Inactive badge */
type StatusColumn<T> = BaseColumn<T> & {
  type: 'status';
  key: keyof T;       // boolean field
  trueLabel?: string;
  falseLabel?: string;
};

/**
 * Custom colored badge from a string value.
 * colorMap: maps raw value → CSS color token.
 * e.g. { 'pending': 'var(--color-warning)', 'approved': 'var(--color-success)' }
 */
type BadgeColumn<T> = BaseColumn<T> & {
  type: 'badge';
  key: keyof T;
  colorMap?: Record<string, string>;
  bgMap?: Record<string, string>;
};

/** Image/avatar thumbnail with initials fallback */
type ImageColumn<T> = BaseColumn<T> & {
  type: 'image';
  key: keyof T;           // URL field
  fallbackKey?: keyof T;  // string to derive initials from (e.g. 'name')
};

/** Action buttons column — always the last column */
type ActionsColumn<T> = BaseColumn<T> & {
  type: 'actions';
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
};

/** Custom render — full control for one-off cases */
type CustomColumn<T> = BaseColumn<T> & {
  type: 'custom';
  header: string;
  render: (row: T) => React.ReactNode;
};

export type DataTableColumn<T> =
  | TextColumn<T>
  | IdColumn<T>
  | ProfileColumn<T>
  | StatusColumn<T>
  | BadgeColumn<T>
  | ImageColumn<T>
  | ActionsColumn<T>
  | CustomColumn<T>;

/* ────────────────────────────────────────────────
   Pagination config
──────────────────────────────────────────────── */
export interface PaginationConfig {
  /** Current 1-indexed page */
  page: number;
  pageSize: number;
  /** Total number of items (used to compute totalPages) */
  total: number;
  onPageChange: (page: number) => void;
  /** Optional sibling count for page number display (default: 1) */
  siblingCount?: number;
}

/* ────────────────────────────────────────────────
   AdminDataTable props
──────────────────────────────────────────────── */
interface AdminDataTableProps<T extends Record<string, any>> {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  rowKey: keyof T;
  isLoading?: boolean;
  error?: unknown;
  emptyMessage?: string;
  skeletonRowCount?: number;
  pagination?: PaginationConfig;
}

/* ────────────────────────────────────────────────
   Helper: initials from a string
──────────────────────────────────────────────── */
function getInitials(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

/* ────────────────────────────────────────────────
   Cell renderer
──────────────────────────────────────────────── */
function renderCell<T extends Record<string, any>>(col: DataTableColumn<T>, row: T): React.ReactNode {
  switch (col.type) {
    case 'id':
      return <TableIdCell style={col.cellStyle}>{String(row[col.key] ?? '-')}</TableIdCell>;

    case 'profile': {
      const sub = col.subKey ? String(row[col.subKey] ?? '') : undefined;
      return (
        <TableProfileCell
          name={String(row[col.key] ?? '-')}
          sub={sub}
          style={col.cellStyle}
        />
      );
    }

    case 'status': {
      const val = Boolean(row[col.key]);
      const label = val ? (col.trueLabel ?? 'Active') : (col.falseLabel ?? 'Inactive');
      return (
        <TableCell style={col.cellStyle}>
          <TableStatusBadge variant={val ? 'active' : 'inactive'}>{label}</TableStatusBadge>
        </TableCell>
      );
    }

    case 'badge': {
      const rawVal = String(row[col.key] ?? '');
      const color = col.colorMap?.[rawVal] ?? 'var(--color-text-muted)';
      const bg = col.bgMap?.[rawVal] ?? 'var(--color-surface-alt)';
      return (
        <TableCell style={col.cellStyle}>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: 'var(--radius-full)',
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em',
            background: bg, color,
          }}>
            {rawVal || '-'}
          </span>
        </TableCell>
      );
    }

    case 'image': {
      const src = row[col.key] ? String(row[col.key]) : null;
      const fallback = col.fallbackKey ? getInitials(String(row[col.fallbackKey] ?? '')) : '?';
      return (
        <TableCell style={col.cellStyle}>
          {src ? (
            <img
              src={src}
              alt={fallback}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--color-surface-alt)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
            }}>
              {fallback}
            </div>
          )}
        </TableCell>
      );
    }

    case 'actions':
      return (
        <TableActionCell>
          {col.onView && (
            <TableIconButton variant="view" title="View Details" onClick={() => col.onView?.(row)} />
          )}
          {col.onEdit && (
            <TableIconButton variant="edit" title="Edit" onClick={() => col.onEdit?.(row)} />
          )}
          {col.onDelete && (
            <TableIconButton variant="delete" title="Delete" onClick={() => col.onDelete?.(row)} />
          )}
        </TableActionCell>
      );

    case 'custom':
      return <TableCell style={col.cellStyle}>{col.render(row)}</TableCell>;

    // 'text' is the default
    default: {
      const textCol = col as TextColumn<T>;
      return (
        <TableCell style={textCol.cellStyle}>
          {String(row[textCol.key] ?? '-')}
        </TableCell>
      );
    }
  }
}

/* ────────────────────────────────────────────────
   AdminDataTable — main export
──────────────────────────────────────────────── */

/**
 * AdminDataTable — generic, fully configurable data table.
 *
 * Features:
 *  - Loading skeleton via AdminTableSkeleton
 *  - Error state
 *  - Empty state with custom message
 *  - Column types: text, id, profile, status, badge, image, actions, custom
 *  - Optional server-side pagination bar
 *
 * Usage:
 *   <AdminDataTable<BusinessUnit>
 *     rowKey="id"
 *     columns={[
 *       { type: 'id', key: 'code', header: 'Code' },
 *       { type: 'text', key: 'name', header: 'Name' },
 *       { type: 'status', key: 'isActive', header: 'Status' },
 *       { type: 'actions', onEdit: handleEdit, onView: handleView },
 *     ]}
 *     data={filteredData}
 *     isLoading={isLoading}
 *     error={error}
 *     pagination={{ page, pageSize: 10, total, onPageChange: setPage }}
 *   />
 */
export function AdminDataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error,
  emptyMessage = 'No records found.',
  skeletonRowCount = 5,
  pagination,
}: AdminDataTableProps<T>) {
  const colCount = columns.length;
  const hasActions = columns.some(c => c.type === 'actions');

  if (isLoading) {
    return (
      <AdminTableSkeleton
        rowCount={skeletonRowCount}
        columnCount={colCount}
        showActionCol={hasActions}
      />
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 'var(--space-8)',
        textAlign: 'center',
        color: 'var(--color-danger)',
        fontSize: 'var(--text-sm)',
      }}>
        Failed to load data. Please try again.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Table
        style={pagination ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' } as any : undefined}
      >
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead
                key={i}
                style={{
                  width: col.width,
                  padding: 'var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  textAlign: col.type === 'actions' ? 'center' : undefined,
                }}
              >
                {col.type === 'actions' ? 'Actions' : (col.header ?? '')}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!data || data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                style={{ textAlign: 'center', padding: 'var(--space-8)' }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>{emptyMessage}</span>
              </TableCell>
            </TableRow>
          ) : (
            data.map(row => (
              <TableRow key={String(row[rowKey])}>
                {columns.map((col, i) => (
                  <React.Fragment key={i}>
                    {renderCell(col, row)}
                  </React.Fragment>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination && (
        <AdminPagination
          currentPage={pagination.page}
          totalPages={Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
          totalItems={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          siblingCount={pagination.siblingCount}
        />
      )}
    </div>
  );
}
