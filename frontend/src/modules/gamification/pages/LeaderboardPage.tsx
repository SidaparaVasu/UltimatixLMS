import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Loader2, Medal, Trophy } from 'lucide-react';
import { organizationApi } from '@/api/organization-api';
import { AdminPagination } from '@/components/ui/pagination';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/authStore';
import { getFullName } from '@/utils/user.utils';
import { cn } from '@/utils/cn';
import { GamificationEmptyState } from '../components/GamificationEmptyState';
import { GamificationErrorState } from '../components/GamificationErrorState';
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';
import { useGamificationLeaderboard } from '../hooks/useGamificationQueries';
import type {
  LeaderboardEntry,
  LeaderboardMyRank,
  LeaderboardPeriod,
} from '../types';

const PAGE_SIZE = 20;

const PERIOD_TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all_time', label: 'All-time' },
];

function formatXp(value: number) {
  return value.toLocaleString();
}

function isCurrentUserRow(
  entry: LeaderboardEntry,
  myRank: LeaderboardMyRank,
  userDisplayName: string,
) {
  if (
    myRank.rank != null &&
    entry.rank === myRank.rank &&
    entry.period_xp === myRank.period_xp
  ) {
    return true;
  }
  return userDisplayName.length > 0 && entry.display_name === userDisplayName;
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Medal size={18} strokeWidth={2} style={{ color: '#D4A017' }} aria-hidden />;
  }
  if (rank === 2) {
    return <Medal size={18} strokeWidth={2} style={{ color: '#94A3B8' }} aria-hidden />;
  }
  if (rank === 3) {
    return <Medal size={18} strokeWidth={2} style={{ color: '#B45309' }} aria-hidden />;
  }
  return (
    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{rank}</span>
  );
}

const filterSelectStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  minWidth: 160,
};

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const userDisplayName = getFullName(user);
  const { isLoading: statusLoading, isEnabled } = useGamificationEnabled();
  const canUseOrgFilters = usePermission(PERMISSIONS.ORG_LOOKUP_VIEW);

  const [period, setPeriod] = useState<LeaderboardPeriod>('monthly');
  const [page, setPage] = useState(1);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [businessUnitId, setBusinessUnitId] = useState<number | undefined>();
  const [designationId, setDesignationId] = useState<number | undefined>();

  const leaderboardParams = useMemo(
    () => ({
      period,
      page,
      page_size: PAGE_SIZE,
      ...(departmentId ? { department_id: departmentId } : {}),
      ...(businessUnitId ? { business_unit_id: businessUnitId } : {}),
      ...(designationId ? { designation_id: designationId } : {}),
    }),
    [period, page, departmentId, businessUnitId, designationId],
  );

  const leaderboardQuery = useGamificationLeaderboard(leaderboardParams);

  const buOptionsQuery = useQuery({
    queryKey: ['org', 'business-unit-options', 'leaderboard'],
    queryFn: () => organizationApi.getBusinessUnitOptions(),
    enabled: isEnabled && canUseOrgFilters,
    staleTime: 120_000,
  });

  const deptOptionsQuery = useQuery({
    queryKey: ['org', 'department-options', 'leaderboard', businessUnitId],
    queryFn: () =>
      organizationApi.getDepartmentOptions(
        businessUnitId ? { business_unit_id: businessUnitId } : undefined,
      ),
    enabled: isEnabled && canUseOrgFilters,
    staleTime: 120_000,
  });

  const jobRoleOptionsQuery = useQuery({
    queryKey: ['org', 'job-role-options', 'leaderboard'],
    queryFn: () => organizationApi.getJobRoleOptions(),
    enabled: isEnabled && canUseOrgFilters,
    staleTime: 120_000,
  });

  const showOrgFilters =
    canUseOrgFilters &&
    (buOptionsQuery.isSuccess ||
      deptOptionsQuery.isSuccess ||
      jobRoleOptionsQuery.isSuccess);

  const businessUnits = buOptionsQuery.data ?? [];
  const departments = deptOptionsQuery.data ?? [];
  const jobRoles = jobRoleOptionsQuery.data ?? [];

  const handlePeriodChange = (next: LeaderboardPeriod) => {
    setPeriod(next);
    setPage(1);
  };

  const handleBusinessUnitChange = (value: string) => {
    setBusinessUnitId(value ? Number(value) : undefined);
    setDepartmentId(undefined);
    setPage(1);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value ? Number(value) : undefined);
    setPage(1);
  };

  const handleDesignationChange = (value: string) => {
    setDesignationId(value ? Number(value) : undefined);
    setPage(1);
  };

  const clearFilters = () => {
    setBusinessUnitId(undefined);
    setDepartmentId(undefined);
    setDesignationId(undefined);
    setPage(1);
  };

  const hasActiveFilters =
    businessUnitId !== undefined ||
    departmentId !== undefined ||
    designationId !== undefined;

  if (statusLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
        <Loader2 size={28} className="animate-spin text-gray-400" />
        <p className="text-gray-500 max-w-md mt-4">Checking gamification status…</p>
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
        <Link
          to="/dashboard"
          className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const data = leaderboardQuery.data;
  const results = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const myRank = data?.my_rank;
  const isInitialLoading = leaderboardQuery.isLoading && data === undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="anim delay-1" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Leaderboard</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Rankings from learning activity in your organization.
          </p>
        </div>
        {myRank && myRank.rank != null && myRank.pool_size > 0 ? (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4) var(--space-5)',
              boxShadow: 'var(--shadow-sm)',
              width: '100%',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Your rank
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#E8833A' }}>#{myRank.rank}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                of {myRank.pool_size}
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {formatXp(myRank.period_xp)} XP this period
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="anim delay-1"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-canvas)',
          }}
        >
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handlePeriodChange(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  period === tab.key
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {leaderboardQuery.isFetching && !isInitialLoading ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Updating…</span>
          ) : null}
        </div>

        {showOrgFilters ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <select
              aria-label="Business unit filter"
              value={businessUnitId ?? ''}
              onChange={(e) => handleBusinessUnitChange(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All business units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Department filter"
              value={departmentId ?? ''}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Designation filter"
              value={designationId ?? ''}
              onChange={(e) => handleDesignationChange(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">All designations</option>
              {jobRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-accent, #2870B8)',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {isInitialLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : leaderboardQuery.isError ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <GamificationErrorState onRetry={() => leaderboardQuery.refetch()} />
          </div>
        ) : results.length === 0 ? (
          <GamificationEmptyState
            title="No activity yet"
            description="No learners match these filters with XP in this period. Try another period or clear filters."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-canvas)' }}>
                    <th style={thStyle}>Rank</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Learner</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Department</th>
                    <th style={thStyle}>XP</th>
                    <th style={thStyle}>Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((entry) => {
                    const isMe =
                      myRank != null &&
                      isCurrentUserRow(entry, myRank, userDisplayName);
                    return (
                      <tr
                        key={`${entry.employee_id}-${entry.rank}`}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: isMe ? 'rgba(232, 131, 58, 0.08)' : undefined,
                        }}
                      >
                        <td style={tdStyleCenter}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <RankCell rank={entry.rank} />
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: isMe ? 600 : 500 }}>{entry.display_name}</span>
                            {isMe ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: '#E8833A',
                                  color: '#fff',
                                }}
                              >
                                You
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {entry.employee_code}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div>{entry.department_name || '—'}</div>
                          {entry.business_unit_name ? (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              {entry.business_unit_name}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                          {formatXp(entry.period_xp)}
                        </td>
                        <td style={tdStyleCenter}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Award size={14} style={{ color: '#E8833A' }} aria-hidden />
                            {entry.badges_count}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
                <AdminPagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};

const tdStyleCenter: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
};
