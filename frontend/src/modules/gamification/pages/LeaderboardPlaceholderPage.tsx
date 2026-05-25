import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';
import { useGamificationSummary } from '../hooks/useGamificationQueries';
import { GamificationQueryState } from '../components/GamificationQueryState';

/**
 * Placeholder until Phase 11 full leaderboard UI.
 * Uses live summary API when gamification is enabled (Phase 9 wiring).
 */
export const LeaderboardPlaceholderPage: React.FC = () => {
  const { isLoading: statusLoading, isEnabled } = useGamificationEnabled();
  const summaryQuery = useGamificationSummary();

  if (statusLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
        <p className="text-gray-500 max-w-md">Checking gamification status…</p>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
          style={{ background: 'var(--color-surface-elevated, #f0f4f8)' }}
        >
          <Trophy size={32} strokeWidth={1.5} style={{ color: '#E8833A' }} />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-500 max-w-md">
          Leaderboard is not available yet. Your administrator can enable gamification when the
          module is rolled out.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center max-w-lg mx-auto">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
        style={{ background: 'var(--color-surface-elevated, #f0f4f8)' }}
      >
        <Trophy size={32} strokeWidth={1.5} style={{ color: '#E8833A' }} />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Leaderboard</h1>
      <GamificationQueryState
        query={summaryQuery}
        loadingMessage="Loading your progress…"
      >
        {(summary) => (
          <div className="space-y-3">
            <p className="text-gray-600">
              You have <strong>{summary.lifetime_xp.toLocaleString()}</strong> lifetime XP
              {summary.pool_size > 0 ? (
                <>
                  {' '}
                  and rank <strong>#{summary.rank}</strong> of {summary.pool_size}
                </>
              ) : null}
              .
            </p>
            <p className="text-sm text-gray-500">
              Full rankings and filters will appear in an upcoming release. Rankings update from
              your learning activity.
            </p>
            <p className="text-sm text-gray-500">
              Badges earned: <strong>{summary.badges_count}</strong>
            </p>
          </div>
        )}
      </GamificationQueryState>
      <Link
        to="/dashboard"
        className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
};
