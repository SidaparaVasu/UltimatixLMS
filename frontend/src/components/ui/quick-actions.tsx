import React from 'react';
import { Plus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface QuickActionItem {
  /** Display label, e.g. "Add Skill" */
  label: string;
  /** Handler called on click */
  onClick: () => void;
  /** Replace the default Plus icon */
  icon?: LucideIcon;
  /** Disable the action */
  disabled?: boolean;
}

interface QuickActionsListProps {
  items: QuickActionItem[];
}

/* ─────────────────────────────────────────────────────────────
   QUICK ACTIONS LIST
───────────────────────────────────────────────────────────── */
/**
 * QuickActionsList — a vertical list of styled action links.
 * Each item renders as a clickable row with a + (or custom) icon.
 *
 * Designed for sidebar panels where users need fast access to common
 * create/navigate actions without opening a dialog first.
 *
 * Usage:
 *   <QuickActionsList items={[
 *     { label: 'Add Skill', onClick: () => openSkillDialog() },
 *     { label: 'Add Category', onClick: () => openCategoryDialog() },
 *   ]} />
 */
export const QuickActionsList: React.FC<QuickActionsListProps> = ({ items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    {items.map((item, idx) => {
      const Icon = item.icon ?? Plus;
      return (
        <button
          key={idx}
          onClick={item.onClick}
          disabled={item.disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: '7px 6px',
            borderRadius: 'var(--radius-sm)',
            background: 'none',
            border: 'none',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            color: item.disabled ? 'var(--color-text-muted)' : 'var(--color-accent)',
            fontSize: '13px',
            fontWeight: 500,
            textAlign: 'left',
            opacity: item.disabled ? 0.5 : 1,
            transition: 'background 100ms',
            width: '100%',
          }}
          onMouseEnter={e => { if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-accent) 8%, transparent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          <Icon size={14} strokeWidth={2.5} />
          {item.label}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   ORDERED ITEM LIST — for displaying ranked items like skill levels
───────────────────────────────────────────────────────────── */
interface OrderedItem {
  id: string;
  label: string;
  /** Optional subtitle / description */
  sub?: string;
  /** Optional badge value (e.g. rank number) */
  rank?: number | string;
}

interface OrderedItemListProps {
  items: OrderedItem[];
  /** Shown when items array is empty */
  emptyText?: string;
  /** Optional action rendered after last item (e.g. InlineAdd trigger) */
  addSlot?: React.ReactNode;
}

/**
 * OrderedItemList — a simple vertical list used to display ranked entities.
 *
 * Used in the sidebar to display Skill Levels. Items are shown in order
 * with an optional rank badge, a label, and a sub-text.
 *
 * Usage:
 *   <OrderedItemList
 *     items={skillLevels.map(l => ({ id: l.id, label: l.name, rank: l.rank, sub: l.description }))}
 *     addSlot={<InlineAdd ... />}
 *   />
 */
export const OrderedItemList: React.FC<OrderedItemListProps> = ({ items, emptyText = 'No items yet.', addSlot }) => (
  <div>
    {items.length === 0 ? (
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>{emptyText}</p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: addSlot ? 'var(--space-3)' : 0 }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: '6px 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {/* Rank badge */}
            {item.rank !== undefined && (
              <div style={{
                width: '22px', height: '22px', flexShrink: 0,
                borderRadius: '50%', background: 'var(--color-surface-alt)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)',
              }}>
                {item.rank}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </div>
              {item.sub && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
                  {item.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}

    {addSlot && <div>{addSlot}</div>}
  </div>
);
