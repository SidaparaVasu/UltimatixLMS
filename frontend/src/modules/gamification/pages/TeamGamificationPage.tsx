import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, Loader2, Trophy } from 'lucide-react';
import { AdminPagination } from '@/components/ui/pagination';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/hooks/usePermission';
import { TeamMemberDetailDrawer } from '../components/TeamMemberDetailDrawer';
import { GamificationEmptyState } from '../components/GamificationEmptyState';
import { GamificationErrorState } from '../components/GamificationErrorState';
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';
import {
  useGamificationTeamList,
  useGamificationTeamQueryEnabled,
} from '../hooks/useGamificationQueries';
import type { TeamGamificationMember } from '../types';

const PAGE_SIZE = 20;

function formatXp(value: number) {
  return value.toLocaleString();
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--text-sm)',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-muted)',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};

export const TeamGamificationPage: React.FC = () => {
  const { isLoading: statusLoading, isEnabled } = useGamificationEnabled();
  const { canViewTeam } = useGamificationTeamQueryEnabled();
  const hasTeamPermission = usePermission(PERMISSIONS.GAMIFICATION_VIEW_TEAM);

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TeamGamificationMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const listParams = useMemo(
    () => ({ page, page_size: PAGE_SIZE }),
    [page],
  );

  const teamQuery = useGamificationTeamList(listParams);
  const rows = teamQuery.data?.results ?? [];
  const totalCount = teamQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const openMember = (member: TeamGamificationMember) => {
    setSelected(member);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelected(null);
  };

  if (statusLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 size={28} className="animate-spin text-gray-400" />
        <p className="text-gray-500 mt-4">Checking gamification status…</p>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
        <Trophy size={40} style={{ color: '#E8833A' }} strokeWidth={1.5} />
        <h1 className="text-2xl font-semibold text-gray-900 mt-4 mb-2">Team learning rewards</h1>
        <p className="text-gray-500 max-w-md">
          Gamification is not enabled for your organization yet.
        </p>
        <Link to="/dashboard" className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!hasTeamPermission || !canViewTeam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access restricted</h1>
        <p className="text-gray-500 max-w-md">
          You need manager gamification permission to view team XP and badges.
        </p>
        <Link to="/dashboard" className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        paddingBottom: 'var(--space-6)',
      }}
    >
      <div className="anim delay-1">
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-3)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Team learning rewards</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 8 }}>
          XP, ranks, streaks, and badges for employees in your reporting scope.
        </p>
      </div>

      <div
        className="anim delay-2"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {teamQuery.isLoading && !teamQuery.data ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : teamQuery.isError ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <GamificationErrorState
              message="Could not load team gamification data."
              onRetry={() => teamQuery.refetch()}
            />
          </div>
        ) : rows.length === 0 ? (
          <GamificationEmptyState
            title="No team members yet"
            description="Employees in your reporting hierarchy will appear here once they earn XP."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Employee</th>
                    <th style={thStyle}>Department</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>XP</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Rank</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Streak</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.employee_id}
                      onClick={() => openMember(row)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-alt)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '';
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{row.display_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {row.employee_code}
                          {row.designation_name ? ` · ${row.designation_name}` : ''}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                        {row.department_name || '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {formatXp(row.lifetime_xp)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>#{row.rank}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                          }}
                        >
                          <Flame size={14} style={{ color: '#E8833A' }} aria-hidden />
                          {row.streaks.learning.current}d
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{row.badges_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                <AdminPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <TeamMemberDetailDrawer
        member={selected}
        open={drawerOpen}
        onClose={closeDrawer}
      />
    </div>
  );
};
