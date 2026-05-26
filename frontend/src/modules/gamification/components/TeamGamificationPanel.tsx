import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flame, Loader2, Trophy } from 'lucide-react';
import {
  useGamificationTeamList,
  useGamificationTeamQueryEnabled,
} from '../hooks/useGamificationQueries';
import type { TeamGamificationMember } from '../types';
import { TeamMemberDetailDrawer } from './TeamMemberDetailDrawer';

const PREVIEW_SIZE = 5;

function formatXp(value: number) {
  return value.toLocaleString();
}

export const TeamGamificationPanel: React.FC = () => {
  const { enabled, statusLoading } = useGamificationTeamQueryEnabled();
  const teamQuery = useGamificationTeamList({ page: 1, page_size: PREVIEW_SIZE });
  const [selected, setSelected] = useState<TeamGamificationMember | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (statusLoading || !enabled) {
    return null;
  }

  const rows = teamQuery.data?.results ?? [];
  const total = teamQuery.data?.count ?? rows.length;

  const openMember = (member: TeamGamificationMember) => {
    setSelected(member);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="activity-panel anim delay-4">
        <div className="panel-head">
          <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={16} style={{ color: '#E8833A' }} aria-hidden />
            Team learning rewards
          </span>
          {total > 0 && (
            <Link
              to="/manager/team-gamification"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-accent)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View all
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {teamQuery.isLoading ? (
          <div style={{ padding: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={22} className="animate-spin text-gray-400" />
          </div>
        ) : teamQuery.isError ? (
          <div
            style={{
              padding: 'var(--space-6)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            Could not load team gamification.
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-6)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            No employees in your reporting scope have gamification data yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 16px',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Employee
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 16px',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    XP
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 16px',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Rank
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '8px 16px',
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Streak
                  </th>
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
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{row.display_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {row.department_name || row.employee_code}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {formatXp(row.lifetime_xp)}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>#{row.rank}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Flame size={13} style={{ color: '#E8833A' }} aria-hidden />
                        {row.streaks.learning.current}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TeamMemberDetailDrawer
        member={selected}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelected(null);
        }}
      />
    </>
  );
};
