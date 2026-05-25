import React from 'react';
import { Trophy } from 'lucide-react';
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';

/**
 * replaced by full LeaderboardPage later.
 */
export const LeaderboardPlaceholderPage: React.FC = () => {
  const { isLoading, isEnabled } = useGamificationEnabled();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
        style={{ background: 'var(--color-surface-elevated, #f0f4f8)' }}
      >
        <Trophy size={32} strokeWidth={1.5} style={{ color: '#E8833A' }} />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Leaderboard</h1>
      {isLoading ? (
        <p className="text-gray-500 max-w-md">Checking gamification status…</p>
      ) : isEnabled ? (
        <p className="text-gray-500 max-w-md">
          Gamification is enabled for your organization. Full leaderboard rankings will appear in a
          upcoming release.
        </p>
      ) : (
        <p className="text-gray-500 max-w-md">
          Leaderboard is not available yet. Your administrator can enable gamification when the
          module is rolled out.
        </p>
      )}
    </div>
  );
};
