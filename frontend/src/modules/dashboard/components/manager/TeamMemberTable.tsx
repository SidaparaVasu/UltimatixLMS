import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { TeamMember } from '@/types/dashboard.types';

interface TeamMemberTableProps {
  members: TeamMember[];
  isLoading: boolean;
}

const StatusBadge: React.FC<{ pct: number }> = ({ pct }) => {
  const color =
    pct >= 80
      ? { bg: 'var(--color-success)', text: '#fff' }
      : pct >= 50
      ? { bg: 'var(--color-warning)', text: '#fff' }
      : { bg: 'var(--color-danger)', text: '#fff' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 11,
        fontWeight: 600,
        background: color.bg,
        color: color.text,
      }}
    >
      {pct}%
    </span>
  );
};

export const TeamMemberTable: React.FC<TeamMemberTableProps> = ({ members, isLoading }) => {
  if (isLoading) {
    return (
      <div className="activity-panel">
        <div className="panel-head">
          <span className="panel-title">Team Members</span>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="activity-item">
            <div className="pulse" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="pulse" style={{ height: 10, width: '50%', background: 'var(--color-border)', borderRadius: 4 }} />
              <div className="pulse" style={{ height: 10, width: '30%', background: 'var(--color-border)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="activity-panel">
        <div className="panel-head">
          <span className="panel-title">Team Members</span>
        </div>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          No direct reports found.
        </div>
      </div>
    );
  }

  return (
    <div
      className="activity-panel anim delay-3"
      style={{ overflowX: 'auto' }}
    >
      <div className="panel-head">
        <span className="panel-title">Team Members</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {members.length} direct report{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['Employee', 'Department', 'In Progress', 'Completed', 'Completion', 'Overdue'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px var(--space-5)',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.employee_id}
              style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-canvas)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '12px var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {member.employee_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {member.employee_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {member.employee_code}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px var(--space-5)', color: 'var(--color-text-secondary)' }}>
                {member.department}
              </td>
              <td style={{ padding: '12px var(--space-5)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {member.in_progress_count}
              </td>
              <td style={{ padding: '12px var(--space-5)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                {member.completed_count}
              </td>
              <td style={{ padding: '12px var(--space-5)' }}>
                <StatusBadge pct={member.completion_percentage} />
              </td>
              <td style={{ padding: '12px var(--space-5)' }}>
                {member.overdue_count > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-danger)', fontSize: 12, fontWeight: 500 }}>
                    <AlertTriangle size={13} />
                    {member.overdue_count}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-success)', fontSize: 12 }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
