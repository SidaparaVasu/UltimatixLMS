import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ClipboardList, UserCheck, CheckCircle } from 'lucide-react';
import { usePendingApprovals } from '@/queries/dashboard/useDashboardQueries';

/* ── Badge ── */
const TypeBadge: React.FC<{ type: 'plan' | 'tni' }> = ({ type }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      background: type === 'plan'
        ? 'oklch(0.5461 0.2152 262.8809 / 0.12)'
        : 'oklch(0.72 0.19 55 / 0.12)',
      color: type === 'plan'
        ? 'oklch(0.5461 0.2152 262.8809)'
        : 'oklch(0.62 0.19 55)',
    }}
  >
    {type === 'plan' ? <ClipboardList size={10} /> : <UserCheck size={10} />}
    {type === 'plan' ? 'Training Plan' : 'TNI Review'}
  </span>
);

export const PendingApprovalsPanel: React.FC = () => {
  const { data, isLoading } = usePendingApprovals();

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="chart-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <span className="section-title">Pending Approvals</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div className="pulse" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="pulse" style={{ height: 10, width: '55%', background: 'var(--color-border)', borderRadius: 4 }} />
              <div className="pulse" style={{ height: 10, width: '35%', background: 'var(--color-border)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const planApprovals = data?.training_plan_approvals ?? [];
  const tniReviews    = data?.tni_reviews_pending ?? [];
  const total         = data?.total ?? 0;

  /* ── Empty state ── */
  if (total === 0) {
    return (
      <div className="chart-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <span className="section-title">Pending Approvals</span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-8)',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            textAlign: 'center',
          }}
        >
          <CheckCircle size={28} style={{ opacity: 0.4 }} />
          All caught up — no pending approvals.
        </div>
      </div>
    );
  }

  return (
    <div className="chart-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <span className="section-title">Pending Approvals</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-danger)',
            color: '#fff',
          }}
        >
          {total}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', overflowY: 'auto', maxHeight: 320 }}>

        {/* ── Training plan approvals ── */}
        {planApprovals.map((item) => (
          <div
            key={`plan-${item.id}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-canvas)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'oklch(0.5461 0.2152 262.8809 / 0.12)',
                color: 'oklch(0.5461 0.2152 262.8809)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ClipboardList size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                {item.plan_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                {item.department}
                {item.submitted_by && ` · by ${item.submitted_by}`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TypeBadge type="plan" />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* ── TNI reviews pending ── */}
        {tniReviews.map((item) => (
          <div
            key={`tni-${item.employee_id}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-canvas)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'oklch(0.72 0.19 55 / 0.12)',
                color: 'oklch(0.62 0.19 55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {item.employee_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                {item.employee_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                {item.employee_code} · Awaiting skill review
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TypeBadge type="tni" />
                {item.submitted_at && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
};
