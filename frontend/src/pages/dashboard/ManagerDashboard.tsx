import React from 'react';
import { useManagerStats, useHrStats, useHrEmployees } from '@/queries/dashboard/useDashboardQueries';
import { TeamStatsGrid } from '@/modules/dashboard/components/manager/TeamStatsGrid';
import { TeamCompletionChart } from '@/modules/dashboard/components/manager/TeamCompletionChart';
import { TeamMemberTable } from '@/modules/dashboard/components/manager/TeamMemberTable';
import { PendingApprovalsPanel } from '@/modules/dashboard/components/manager/PendingApprovalsPanel';

const ManagerDashboard: React.FC = () => {
  // KPI cards — company-wide stats scoped by HR role assignment
  const { data: hrData, isLoading: hrLoading } = useHrStats();
  // Chart + table — per-employee breakdown scoped by HR role assignment
  const { data: employees, isLoading: empLoading } = useHrEmployees();
  // Preserved — still available for future manager-specific features
  const { data: managerStatsData } = useManagerStats();

  const hrStats = hrData ?? null;
  const scopedEmployees = employees ?? [];

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
          HR Dashboard
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Employee learning overview scoped to your assigned area.
        </p>
      </div>

      {/* KPI row — company/scope-wide numbers */}
      <TeamStatsGrid
        stats={managerStatsData ?? null}
        hrStats={hrStats}
        isLoading={hrLoading}
      />

      {/* Chart + Pending approvals */}
      <div className="two-col anim delay-3">
        <TeamCompletionChart members={scopedEmployees} isLoading={empLoading} />
        <PendingApprovalsPanel />
      </div>

      {/* Employee table — scoped by HR role assignment */}
      <div className="anim delay-4">
        <TeamMemberTable members={scopedEmployees} isLoading={empLoading} />
      </div>
    </div>
  );
};

export default ManagerDashboard;
