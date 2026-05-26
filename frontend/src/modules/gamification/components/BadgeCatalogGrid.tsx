import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Badge } from '../types';
import { BadgeIcon } from './BadgeIcon';

type BadgeFilter = 'all' | 'earned' | 'locked';

interface BadgeCatalogGridProps {
  badges: Badge[];
  earnedAtByCode?: Record<string, string>;
}

function formatEarnedDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const BadgeCatalogGrid: React.FC<BadgeCatalogGridProps> = ({
  badges,
  earnedAtByCode = {},
}) => {
  const [filter, setFilter] = useState<BadgeFilter>('all');

  const sorted = useMemo(
    () => [...badges].sort((a, b) => a.sort_order - b.sort_order),
    [badges],
  );

  const filtered = useMemo(() => {
    if (filter === 'earned') return sorted.filter((b) => b.is_earned);
    if (filter === 'locked') return sorted.filter((b) => !b.is_earned);
    return sorted;
  }, [sorted, filter]);

  const earnedCount = sorted.filter((b) => b.is_earned).length;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          {earnedCount} of {sorted.length} badges earned
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'earned', 'locked'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {key === 'all' ? 'All' : key === 'earned' ? 'Earned' : 'Locked'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          {filter === 'earned' ? 'No badges earned yet.' : 'No locked badges in this view.'}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {filtered.map((badge) => {
            const earnedAt = earnedAtByCode[badge.code];
            return (
              <div
                key={badge.code}
                title={badge.description}
                style={{
                  position: 'relative',
                  background: 'var(--color-surface)',
                  border: `1px solid ${badge.is_earned ? '#E8833A44' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  textAlign: 'center',
                  opacity: badge.is_earned ? 1 : 0.72,
                  boxShadow: badge.is_earned ? 'var(--shadow-sm)' : undefined,
                }}
              >
                {!badge.is_earned ? (
                  <Lock
                    size={14}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      color: 'var(--color-text-muted)',
                    }}
                    aria-hidden
                  />
                ) : null}
                <div style={{ margin: '0 auto 10px', width: 48, height: 48 }}>
                  <BadgeIcon badge={badge} size={48} />
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 4 }}>
                  {badge.name}
                </div>
                {/* <p
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-muted)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {badge.description}
                </p> */}
                {badge.is_earned && earnedAt ? (
                  <p style={{ fontSize: 10, color: '#E8833A', marginTop: 8, fontWeight: 600 }}>
                    Earned {formatEarnedDate(earnedAt)}
                  </p>
                ) : !badge.is_earned ? (
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 8 }}>
                    Locked
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
