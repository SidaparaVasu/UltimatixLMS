import { Flame } from 'lucide-react';
import type { Streaks } from '../types';

const STREAK_ITEMS: {
  key: keyof Streaks;
  label: string;
  hint: string;
}[] = [
  {
    key: 'learning',
    label: 'Learning streak',
    hint: 'Days with enough learning activity',
  },
  {
    key: 'pass_daily',
    label: 'Daily pass streak',
    hint: 'Consecutive days passing an assessment',
  },
  {
    key: 'attempt_daily',
    label: 'Daily attempt streak',
    hint: 'Consecutive days attempting assessments',
  },
  {
    key: 'pass_consecutive',
    label: 'Pass streak',
    hint: 'Consecutive assessment passes',
  },
];

interface StreakCardsProps {
  streaks: Streaks;
}

export const StreakCards: React.FC<StreakCardsProps> = ({ streaks }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 'var(--space-4)',
    }}
  >
    {STREAK_ITEMS.map(({ key, label, hint }) => {
      const snap = streaks[key];
      return (
        <div
          key={key}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Flame size={18} style={{ color: '#E8833A' }} aria-hidden />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{label}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
            {hint}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Current
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#E8833A' }}>{snap.current}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-muted)',
                }}
              >
                Best
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{snap.longest}</div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
