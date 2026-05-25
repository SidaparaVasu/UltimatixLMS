import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  useGamificationMyBadges,
  useGamificationSummary,
} from '@/modules/gamification/hooks/useGamificationQueries';
import { badgeVisual } from '@/modules/gamification/utils/badgeVisual';

const MAX_BADGE_ICONS = 4;

function formatXp(value: number) {
  return value.toLocaleString();
}

const GamificationStripSkeleton: React.FC = () => (
  <div className="gamification-panel anim delay-1" aria-busy="true" aria-label="Loading gamification">
    <div className="gami-stat">
      <span className="gami-stat-label">Learning Points</span>
      <span className="gami-skeleton-block gami-skeleton-value" />
    </div>
    <div className="gami-divider" />
    <div className="gami-stat">
      <span className="gami-stat-label">Company Rank</span>
      <span className="gami-skeleton-block gami-skeleton-rank" />
      <span className="gami-skeleton-block gami-skeleton-sub" />
    </div>
    <div className="gami-divider" />
    <div className="gami-stat">
      <span className="gami-stat-label">Earned Badges</span>
    </div>
    <div className="gami-badges-wrap">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="gami-skeleton-block gami-skeleton-badge" />
      ))}
    </div>
    <div className="gami-divider" />
    <span className="gami-skeleton-block gami-skeleton-link" />
  </div>
);

export const GamificationStrip: React.FC = () => {
  const summaryQuery = useGamificationSummary();
  const badgesQuery = useGamificationMyBadges();

  const isLoading =
    summaryQuery.isLoading ||
    badgesQuery.isLoading ||
    (summaryQuery.isFetching && !summaryQuery.data);

  if (isLoading) {
    return <GamificationStripSkeleton />;
  }

  if (summaryQuery.isError) {
    return (
      <div className="gamification-panel anim delay-1">
        <p className="text-sm text-gray-500 flex-1">
          Could not load your learning points.{' '}
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => summaryQuery.refetch()}
          >
            Retry
          </button>
        </p>
      </div>
    );
  }

  const summary = summaryQuery.data;
  if (!summary) {
    return null;
  }

  const earnedBadges = badgesQuery.data ?? [];
  const visibleBadges = earnedBadges.slice(0, MAX_BADGE_ICONS);
  const extraBadgeCount = Math.max(0, (summary.badges_count || earnedBadges.length) - visibleBadges.length);

  const rankLabel =
    summary.pool_size > 0 ? `#${summary.rank}` : '—';
  const rankSub =
    summary.pool_size > 0
      ? `of ${summary.pool_size} in company`
      : 'Rankings appear as learners earn XP';

  return (
    <div className="gamification-panel anim delay-1">
      <div className="gami-stat">
        <span className="gami-stat-label">Learning Points</span>
        <span className="gami-stat-value">{formatXp(summary.lifetime_xp)}</span>
      </div>

      <div className="gami-divider" />

      <div className="gami-stat">
        <span className="gami-stat-label">Company Rank</span>
        <span className="gami-rank-value">{rankLabel}</span>
        <span className="gami-rank-sub">{rankSub}</span>
      </div>

      <div className="gami-divider" />

      <div className="gami-stat">
        <span className="gami-stat-label">Earned Badges</span>
        {summary.badges_count === 0 ? (
          <span className="gami-rank-sub">None yet — keep learning!</span>
        ) : null}
      </div>

      <div className="gami-badges-wrap">
        {visibleBadges.length > 0 ? (
          visibleBadges.map((badge) => {
            const visual = badgeVisual(badge);
            const Icon = visual.icon;
            return (
              <div
                key={badge.code}
                className="gami-badge-item"
                style={{ background: visual.bg }}
                data-tip={badge.name}
                title={badge.name}
              >
                <Icon size={18} color={visual.color} strokeWidth={1.5} />
              </div>
            );
          })
        ) : summary.badges_count > 0 ? (
          <span className="gami-rank-sub">{summary.badges_count} earned</span>
        ) : null}
        {extraBadgeCount > 0 ? (
          <span className="gami-rank-sub">+{extraBadgeCount} more</span>
        ) : null}
      </div>

      <div className="gami-divider" />

      <Link to="/leaderboard" className="gami-link">
        View Leaderboard
        <ChevronRight size={13} strokeWidth={2.5} />
      </Link>
    </div>
  );
};
