import React from 'react';
import { Users, TrendingUp, BookOpen, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import type { ManagerTeamStats } from '@/types/dashboard.types';

interface TeamStatsGridProps {
  stats: ManagerTeamStats | null | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  trend: string;
  trendDir: 'up' | 'down' | 'neutral';
  trendSub: string;
  icon: React.ElementType;
  delayClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, trendDir, trendSub, icon: Icon, delayClass }) => {
  const TrendIcon = trendDir === 'up' ? ChevronUp : trendDir === 'down' ? ChevronDown : null;
  return (
    <div className={`kpi-card anim ${delayClass}`}>
      <div className="kpi-card-body">
        <div className="kpi-top">
          <div className="kpi-icon-wrap"><Icon size={18} /></div>
          <span className="kpi-label">{label}</span>
        </div>
        <div className="kpi-value">{value}</div>
        <div className={`kpi-trend ${trendDir}`}>
          {TrendIcon && <TrendIcon size={12} strokeWidth={2.5} />}
          {trend}
          <span className="kpi-trend-sub">{trendSub}</span>
        </div>
      </div>
    </div>
  );
};

const SkeletonCard: React.FC<{ delayClass: string }> = ({ delayClass }) => (
  <div className={`kpi-card anim ${delayClass}`}>
    <div className="kpi-card-body">
      <div className="kpi-top">
        <div className="pulse" style={{ width: 18, height: 18, background: 'var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
        <div className="pulse" style={{ width: 80, height: 10, background: 'var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
      </div>
      <div className="pulse" style={{ width: 60, height: 32, background: 'var(--color-border)', borderRadius: 'var(--radius-sm)', margin: '8px 0' }} />
      <div className="pulse" style={{ width: 100, height: 10, background: 'var(--color-border)', borderRadius: 'var(--radius-sm)' }} />
    </div>
  </div>
);

export const TeamStatsGrid: React.FC<TeamStatsGridProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="kpi-grid">
        {['delay-1', 'delay-2', 'delay-3', 'delay-4'].map((d) => (
          <SkeletonCard key={d} delayClass={d} />
        ))}
      </div>
    );
  }

  const cards: StatCardProps[] = [
    {
      label: 'Team Size',
      value: stats?.team_size ?? 0,
      trend: `${stats?.team_size ?? 0} members`,
      trendDir: 'neutral',
      trendSub: 'direct reports',
      icon: Users,
      delayClass: 'delay-1',
    },
    {
      label: 'Completion Rate',
      value: `${stats?.team_completion_rate ?? 0}%`,
      trend: `${stats?.team_completion_rate ?? 0}%`,
      trendDir: (stats?.team_completion_rate ?? 0) >= 70 ? 'up' : 'down',
      trendSub: 'team average',
      icon: TrendingUp,
      delayClass: 'delay-2',
    },
    {
      label: 'In Progress',
      value: stats?.team_in_progress ?? 0,
      trend: `${stats?.team_in_progress ?? 0} active`,
      trendDir: 'up',
      trendSub: 'enrollments',
      icon: BookOpen,
      delayClass: 'delay-3',
    },
    {
      label: 'Overdue',
      value: stats?.team_overdue ?? 0,
      trend: stats?.team_overdue ? `${stats.team_overdue} overdue` : 'All on track',
      trendDir: stats?.team_overdue ? 'down' : 'neutral',
      trendSub: stats?.team_overdue ? 'action needed' : '',
      icon: AlertTriangle,
      delayClass: 'delay-4',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
};
