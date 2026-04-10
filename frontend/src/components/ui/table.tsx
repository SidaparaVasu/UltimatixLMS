import * as React from 'react';
import { cn } from '@/utils/cn';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Trash2,
  XCircle,
  Eye,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TABLE WRAPPER
───────────────────────────────────────────────────────────── */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div
    className="w-full overflow-auto"
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
    }}
  >
    <table
      ref={ref}
      className={cn('w-full caption-bottom', className)}
      style={{
        borderCollapse: 'collapse',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-primary)',
        tableLayout: 'auto',
      }}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

/* ─────────────────────────────────────────────────────────────
   THEAD
───────────────────────────────────────────────────────────── */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(className)}
    style={{ background: 'var(--color-surface)', }}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

/* ─────────────────────────────────────────────────────────────
   TBODY
───────────────────────────────────────────────────────────── */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

/* ─────────────────────────────────────────────────────────────
   TFOOT
───────────────────────────────────────────────────────────── */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('font-medium', className)}
    style={{
      background: 'var(--color-surface-alt)',
      borderTop: '1px solid var(--color-border)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-secondary)',
    }}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

/* ─────────────────────────────────────────────────────────────
   TABLE ROW
───────────────────────────────────────────────────────────── */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('border-b transition-colors', className)}
    style={{ borderBottomColor: 'var(--color-border)' }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLTableRowElement).style.background =
        'var(--color-canvas)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
    }}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

/* ─────────────────────────────────────────────────────────────
   TABLE HEAD CELL
───────────────────────────────────────────────────────────── */
type SortDirection = 'asc' | 'desc' | false;

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => (
    <th
      ref={ref}
      onClick={sortable ? onSort : undefined}
      className={cn(
        'text-left align-middle',
        sortable && 'cursor-pointer select-none',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      style={{
        height: '44px',
        padding: '0 var(--space-4)',
        fontSize: '11px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#000000ff',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--color-border)',
      }}
      {...props}
    >
      {sortable ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 150ms ease',
            color: sortDirection
              ? 'var(--color-text-secondary)'
              : 'var(--color-text-muted)',
          }}
          onMouseEnter={e =>
            ((e.currentTarget as HTMLSpanElement).style.color =
              'var(--color-text-primary)')
          }
          onMouseLeave={e =>
            ((e.currentTarget as HTMLSpanElement).style.color = sortDirection
              ? 'var(--color-text-secondary)'
              : 'var(--color-text-muted)')
          }
        >
          {children}
          {sortDirection === 'asc' ? (
            <ChevronUp size={12} strokeWidth={2.5} />
          ) : sortDirection === 'desc' ? (
            <ChevronDown size={12} strokeWidth={2.5} />
          ) : (
            <ChevronsUpDown
              size={12}
              strokeWidth={2}
              style={{ opacity: 0.35 }}
            />
          )}
        </span>
      ) : (
        children
      )}
    </th>
  )
);
TableHead.displayName = 'TableHead';

/* ─────────────────────────────────────────────────────────────
   TABLE CELL
───────────────────────────────────────────────────────────── */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, style, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('[&:has([role=checkbox])]:pr-0', className)}
    style={{
      padding: '0 var(--space-4)',
      height: '62px',
      verticalAlign: 'middle',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-secondary)',
      fontWeight: 400,
      ...style,
    }}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/* ─────────────────────────────────────────────────────────────
   TABLE CAPTION
───────────────────────────────────────────────────────────── */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4', className)}
    style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableIdCell
───────────────────────────────────────────────────────────── */
const TableIdCell = ({
  children,
  className,
  style,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell className={className} style={style} {...props}>
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  </TableCell>
);
TableIdCell.displayName = 'TableIdCell';

/* ─────────────────────────────────────────────────────────────
   HELPER — TablePillCell
───────────────────────────────────────────────────────────── */
type PillColor = 'blue' | 'green' | 'orange' | 'red' | 'grey';

const pillColors: Record<PillColor, { bg: string; color: string }> = {
  blue:   { bg: 'rgba(37,99,235,0.10)',  color: 'var(--color-info)' },
  green:  { bg: 'rgba(26,158,58,0.10)',  color: 'var(--color-success)' },
  orange: { bg: 'rgba(255,100,32,0.10)', color: 'var(--color-accent)' },
  red:    { bg: 'rgba(220,38,38,0.10)',  color: 'var(--color-danger)' },
  grey:   { bg: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' },
};

interface TablePillCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  color?: PillColor;
}

const TablePillCell = ({
  children,
  color = 'blue',
  className,
  style,
  ...props
}: TablePillCellProps) => {
  const c = pillColors[color];
  return (
    <TableCell className={className} style={style} {...props}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: c.bg,
          color: c.color,
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-body)',
          flexShrink: 0,
        }}
      >
        {children}
      </span>
    </TableCell>
  );
};
TablePillCell.displayName = 'TablePillCell';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableProfileCell
───────────────────────────────────────────────────────────── */
interface TableProfileCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  name: string;
  sub?: string;
  avatar?: React.ReactNode;
}

const TableProfileCell = ({
  name,
  sub,
  avatar,
  className,
  style,
  ...props
}: TableProfileCellProps) => (
  <TableCell className={className} style={style} {...props}>
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
    >
      {avatar && <div style={{ flexShrink: 0 }}>{avatar}</div>}
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </p>
        {sub && (
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  </TableCell>
);
TableProfileCell.displayName = 'TableProfileCell';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableStatusBadge
   variant: 'active' | 'inactive' | 'pending' | 'warning' | 'info'
───────────────────────────────────────────────────────────── */
type StatusVariant = 'active' | 'inactive' | 'pending' | 'warning' | 'info';

const statusStyles: Record<
  StatusVariant,
  { bg: string; color: string; border: string }
> = {
  active: {
    bg:     'rgba(26,158,58,0.10)',
    color:  '#15803d',
    border: 'transparent',
  },
  inactive: {
    bg:     'var(--color-surface-alt)',
    color:  'var(--color-text-muted)',
    border: 'transparent',
  },
  pending: {
    bg:     'rgba(217,119,6,0.08)',
    color:  'var(--color-warning)',
    border: 'rgba(217,119,6,0.35)',
  },
  warning: {
    bg:     'rgba(217,119,6,0.08)',
    color:  'var(--color-warning)',
    border: 'rgba(217,119,6,0.35)',
  },
  info: {
    bg:     'rgba(37,99,235,0.08)',
    color:  'var(--color-info)',
    border: 'transparent',
  },
};

interface TableStatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
}

const TableStatusBadge = ({
  variant = 'active',
  children,
}: TableStatusBadgeProps) => {
  const s = statusStyles[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </span>
  );
};
TableStatusBadge.displayName = 'TableStatusBadge';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableActionCell
   Right-aligned wrapper for action buttons.
───────────────────────────────────────────────────────────── */
const TableActionCell = ({
  children,
  className,
  style,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell
    className={className}
    style={{ textAlign: 'center', whiteSpace: 'nowrap', ...style }}
    {...props}
  >
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '4px',
      }}
    >
      {children}
    </div>
  </TableCell>
);
TableActionCell.displayName = 'TableActionCell';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableIconButton
   Edit = accent pencil, Delete = red trash,
   Remove = amber circle-x, View = blue eye.
   Each shows a tinted bg square on hover.
───────────────────────────────────────────────────────────── */
type IconButtonVariant = 'edit' | 'delete' | 'remove' | 'view';

const iconButtonConfig: Record<
  IconButtonVariant,
  { icon: React.ElementType; color: string; hoverBg: string }
> = {
  edit:   {
    icon:    Pencil,
    color:   'var(--color-accent)',
    hoverBg: 'var(--color-accent-subtle)',
  },
  delete: {
    icon:    Trash2,
    color:   'var(--color-danger)',
    hoverBg: 'rgba(220,38,38,0.08)',
  },
  remove: {
    icon:    XCircle,
    color:   'var(--color-warning)',
    hoverBg: 'rgba(217,119,6,0.08)',
  },
  view: {
    icon:    Eye,
    color:   'var(--color-info)',
    hoverBg: 'rgba(37,99,235,0.08)',
  },
};

interface TableIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: IconButtonVariant;
}

const TableIconButton = ({
  variant,
  title,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: TableIconButtonProps) => {
  const cfg = iconButtonConfig[variant];
  const Icon = cfg.icon;
  return (
    <button
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        color: cfg.color,
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = cfg.hoverBg;
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        onMouseLeave?.(e);
      }}
      {...props}
    >
      <Icon size={15} strokeWidth={1.75} />
    </button>
  );
};
TableIconButton.displayName = 'TableIconButton';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableActionButton
   action buttons — solid fill primary
   variant: 'primary' | 'danger' | 'secondary'
   Usage:
     <TableActionCell>
       <TableActionButton variant="primary" icon={CheckCircle}>
         Mark as Processed
       </TableActionButton>
       <TableActionButton variant="danger" icon={RotateCcw}>
         Return
       </TableActionButton>
     </TableActionCell>
───────────────────────────────────────────────────────────── */
type ActionButtonVariant = 'primary' | 'secondary' | 'danger';

interface TableActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant;
  icon?: React.ElementType;
}

const actionButtonStyles: Record<
  ActionButtonVariant,
  {
    bg: string;
    color: string;
    border: string;
    hoverBg: string;
    hoverBorder: string;
  }
> = {
  primary: {
    bg:          'var(--color-success)',
    color:       '#fff',
    border:      'var(--color-success)',
    hoverBg:     '#15803d',
    hoverBorder: '#15803d',
  },
  secondary: {
    bg:          'transparent',
    color:       'var(--color-text-secondary)',
    border:      'var(--color-border)',
    hoverBg:     'var(--color-surface-alt)',
    hoverBorder: 'var(--color-border-strong)',
  },
  danger: {
    bg:          'transparent',
    color:       'var(--color-danger)',
    border:      'var(--color-danger)',
    hoverBg:     'rgba(220,38,38,0.06)',
    hoverBorder: 'var(--color-danger)',
  },
};

const TableActionButton = ({
  variant = 'secondary',
  icon: Icon,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: TableActionButtonProps) => {
  const s = actionButtonStyles[variant];
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        padding: '0 12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background-color 150ms ease, border-color 150ms ease',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = s.hoverBg;
        el.style.borderColor = s.hoverBorder;
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = s.bg;
        el.style.borderColor = s.border;
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {Icon && <Icon size={13} strokeWidth={2} />}
      {children}
    </button>
  );
};
TableActionButton.displayName = 'TableActionButton';

/* ─────────────────────────────────────────────────────────────
   HELPER — TableLinkCell
───────────────────────────────────────────────────────────── */
interface TableLinkCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  label: string;
  onClick?: () => void;
}

const TableLinkCell = ({
  label,
  onClick,
  className,
  style,
  ...props
}: TableLinkCellProps) => (
  <TableCell className={className} style={style} {...props}>
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-sm)',
        fontWeight: 500,
        color: 'var(--color-info)',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(37,99,235,0.3)',
        textUnderlineOffset: '3px',
        transition: 'opacity 150ms ease',
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLButtonElement).style.opacity = '0.7')
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
      }
    >
      {label}
    </button>
  </TableCell>
);
TableLinkCell.displayName = 'TableLinkCell';

/* ─────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────── */
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  // helpers
  TableIdCell,
  TablePillCell,
  TableProfileCell,
  TableStatusBadge,
  TableActionCell,
  TableIconButton,
  TableActionButton,
  TableLinkCell,
};

export type { SortDirection, StatusVariant, IconButtonVariant, ActionButtonVariant };