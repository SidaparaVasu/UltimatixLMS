import React, { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ViewMode = 'grid' | 'table';

interface GridSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  gridContent: React.ReactNode;
  tableContent: React.ReactNode;
  className?: string;
}

/**
 * A reusable layout switcher that manages the toggle between Card and Table views.
 */
export const GridSwitcher: React.FC<GridSwitcherProps> = ({
  viewMode,
  onViewModeChange,
  gridContent,
  tableContent,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-end">
        <div 
          className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg shadow-sm"
        >
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              viewMode === 'grid' 
                ? "bg-white text-[var(--color-accent)] shadow-sm" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <LayoutGrid size={14} />
            GRID VIEW
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              viewMode === 'table' 
                ? "bg-white text-[var(--color-accent)] shadow-sm" 
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <List size={14} />
            TABLE VIEW
          </button>
        </div>
      </div>

      <div className="w-full">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 anim">
            {gridContent}
          </div>
        ) : (
          <div className="anim">
            {tableContent}
          </div>
        )}
      </div>
    </div>
  );
};
