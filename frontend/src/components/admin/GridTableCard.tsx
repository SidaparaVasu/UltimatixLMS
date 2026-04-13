import React from 'react';
import { MoreVertical, Eye, Pencil, Trash2, LayoutGrid } from 'lucide-react';
import { StatusVariant, TableStatusBadge } from '@/components/ui/table';
import { cn } from '@/utils/cn';

export interface GridTableCardProps<T> {
  title: string;
  subtitle?: string;
  description?: string;
  isActive?: boolean;
  metrics?: { label: string; value: string | number }[];
  imageUrl?: string;
  icon?: React.ElementType;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: React.ReactNode;
  row: T;
  className?: string;
}

/**
 * A premium card for grid-based management.
 */
export const GridTableCard = <T,>({
  title,
  subtitle,
  description,
  isActive = true,
  metrics,
  imageUrl,
  icon: Icon = LayoutGrid,
  onView,
  onEdit,
  onDelete,
  actions,
  className,
}: GridTableCardProps<T>) => {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300",
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]",
        "hover:shadow-xl hover:border-[var(--color-accent)] hover:-translate-y-1",
        className
      )}
      style={{ minHeight: '220px' }}
    >
      {/* Top Section: Status & Actions */}
      <div className="flex items-center justify-between p-4 pb-0">
        <TableStatusBadge variant={isActive ? 'active' : 'inactive'}>
          {isActive ? 'Active' : 'Inactive'}
        </TableStatusBadge>
        
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-md hover:bg-[var(--color-surface-alt)] text-[var(--color-accent)] transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 p-4 pt-4">
        <div className="flex items-start gap-4 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug truncate" title={title}>
              {title}
              {subtitle && (
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] ml-2">
                  ({subtitle})
                </span>
              )}
            </h3>
          </div>
        </div>

        {description && (
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-[var(--color-border)] border-dashed">
          <div className="flex flex-wrap gap-3">
            {metrics?.map((m, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                  {m.label}
                </span>
                <span className="text-sm font-bold text-[var(--color-text-primary)]">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Overlay Action (View Details) */}
      {onView && (
        <div 
          onClick={onView}
          className="absolute inset-x-0 bottom-0 h-10 flex items-center justify-center bg-[var(--color-accent)] text-white text-xs font-bold opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all cursor-pointer"
        >
          VIEW DETAILS
        </div>
      )}
    </div>
  );
};
