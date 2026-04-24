import React from 'react';
import { Users, BookOpen, TrendingUp, Award, ClipboardList, Bell, ChevronUp, ChevronDown } from 'lucide-react';
import type { AdminPortalStats } from '@/types/dashboard.types';

interface AdminStatsGridProps {
  stats: AdminPortalStats | null | undefined;
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

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5', 'delay-6'].map((d) => (
          <SkeletonCard key={d} delayClass={d} />
        ))}
      </div>
    );
  }

  const cards: StatCardProps[] = [
    {
      label: 'Active Users',
      value: stats?.active_users ?? 0,
      trend: `${stats?.active_users ?? 0} users`,
      trendDir: 'up',
      trendSub: 'registered',
      icon: Users,
      delayClass: 'delay-1',
    },
    {
      label: 'Published Courses',
      value: stats?.published_courses ?? 0,
      trend: `${stats?.published_courses ?? 0} live`,
      trendDir: 'up',
      trendSub: 'in catalog',
      icon: BookOpen,
      delayClass: 'delay-2',
    },
    {
      label: 'Total Enrollments',
      value: stats?.total_enrollments ?? 0,
      trend: `${stats?.total_enrollments ?? 0} total`,
      trendDir: 'up',
      trendSub: 'all time',
      icon: ClipboardList,
      delayClass: 'delay-3',
    },
    {
      label: 'Completion Rate',
      value: `${stats?.completion_rate ?? 0}%`,
      trend: `${stats?.completion_rate ?? 0}%`,
      trendDir: (stats?.completion_rate ?? 0) >= 70 ? 'up' : 'down',
      trendSub: 'overall',
      icon: TrendingUp,
      delayClass: 'delay-4',
    },
    {
      label: 'Certificates Issued',
      value: stats?.certificates_issued ?? 0,
      trend: `${stats?.certificates_issued ?? 0} issued`,
      trendDir: 'up',
      trendSub: 'all time',
      icon: Award,
      delayClass: 'delay-5',
    },
    {
      label: 'Pending Approvals',
      value: stats?.pending_approvals ?? 0,
      trend: stats?.pending_approvals ? `${stats.pending_approvals} pending` : 'None pending',
      trendDir: stats?.pending_approvals ? 'down' : 'neutral',
      trendSub: stats?.pending_approvals ? 'action needed' : '',
      icon: Bell,
      delayClass: 'delay-6',
    },
  ];

  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
};
