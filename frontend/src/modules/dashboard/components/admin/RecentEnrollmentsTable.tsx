import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRecentEnrollments } from '@/queries/dashboard/useDashboardQueries';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    IN_PROGRESS: { bg: 'oklch(0.5461 0.2152 262.8809 / 0.12)', text: 'oklch(0.5461 0.2152 262.8809)' },
    COMPLETED: { bg: 'oklch(0.63 0.17 155 / 0.12)', text: 'oklch(0.63 0.17 155)' },
    NOT_STARTED: { bg: 'var(--color-canvas)', text: 'var(--color-text-muted)' },
    DROPPED: { bg: 'oklch(0.57 0.22 27 / 0.12)', text: 'oklch(0.57 0.22 27)' },
  };

  const color = colors[status] || colors.NOT_STARTED;

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 11,
        fontWeight: 500,
        background: color.bg,
        color: color.text,
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
};

export const RecentEnrollmentsTable: React.FC = () => {
  const { data: enrollments, isLoading } = useRecentEnrollments(10);

  if (isLoading) {
    return (
      <div className="activity-panel">
        <div className="panel-head">
          <span className="panel-title">Recent Enrollments</span>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="activity-item">
            <div className="pulse" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="pulse" style={{ height: 10, width: '60%', background: 'var(--color-border)', borderRadius: 4 }} />
              <div className="pulse" style={{ height: 10, width: '40%', background: 'var(--color-border)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="activity-panel">
        <div className="panel-head">
          <span className="panel-title">Recent Enrollments</span>
        </div>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          No enrollments yet.
        </div>
      </div>
    );
  }

  return (
    <div className="activity-panel anim delay-4" style={{ overflowX: 'auto' }}>
      <div className="panel-head">
        <span className="panel-title">Recent Enrollments</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Last {enrollments.length} enrollments
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['Employee', 'Course', 'Enrolled', 'Status', 'Progress'].map((h) => (
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
          {enrollments.map((enrollment, i) => (
            <tr
              key={i}
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
                    {enrollment.employee_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {enrollment.employee_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {enrollment.employee_code}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px var(--space-5)' }}>
                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {enrollment.course_title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {enrollment.course_code}
                </div>
              </td>
              <td style={{ padding: '12px var(--space-5)', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                {formatDistanceToNow(new Date(enrollment.enrolled_at), { addSuffix: true })}
              </td>
              <td style={{ padding: '12px var(--space-5)' }}>
                <StatusBadge status={enrollment.status} />
              </td>
              <td style={{ padding: '12px var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      background: 'var(--color-canvas)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${enrollment.progress_percentage}%`,
                        background: 'var(--color-accent)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', minWidth: 32 }}>
                    {Math.round(enrollment.progress_percentage)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
