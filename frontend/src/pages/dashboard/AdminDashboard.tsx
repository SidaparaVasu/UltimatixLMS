import React from 'react';
import { useAdminStats } from '@/queries/dashboard/useDashboardQueries';
import { AdminStatsGrid } from '@/modules/dashboard/components/admin/AdminStatsGrid';
import { PortalActivityChart } from '@/modules/dashboard/components/admin/PortalActivityChart';
import { QuickActionsPanel } from '@/modules/dashboard/components/admin/QuickActionsPanel';
import { RecentEnrollmentsTable } from '@/modules/dashboard/components/admin/RecentEnrollmentsTable';

const AdminDashboard: React.FC = () => {
  const { data: statsData, isLoading } = useAdminStats();
  const stats = statsData ?? null;

  return (
    <div style={{ padding: 'var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page header */}
      <div className="anim delay-1">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          Admin Dashboard
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Portal-wide statistics and activity overview.
        </p>
      </div>

      {/* 6-card KPI grid */}
      <AdminStatsGrid stats={stats} isLoading={isLoading} />

      {/* Activity chart + Quick actions */}
      <div className="two-col anim delay-3">
        <PortalActivityChart />
        <QuickActionsPanel />
      </div>

      {/* Recent enrollments table */}
      <div className="anim delay-4">
        <RecentEnrollmentsTable />
      </div>
    </div>
  );
};

export default AdminDashboard;
