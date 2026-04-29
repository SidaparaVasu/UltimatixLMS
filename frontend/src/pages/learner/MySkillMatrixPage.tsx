import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, ArrowRight, RefreshCw } from 'lucide-react';
import { useMySkillMatrix } from '@/queries/tni/useTNIQueries';
import { SkillMatrixTable } from '@/components/tni/SkillMatrixTable';
import { SkillGapBadge } from '@/components/tni/SkillGapBadge';
import { RatingStatusBanner } from '@/components/tni/RatingStatusBanner';
import { SkillMatrixRow, GapSeverity } from '@/types/tni.types';

// ---------------------------------------------------------------------------
// Summary stat card
// ---------------------------------------------------------------------------

const StatCard: React.FC<{
  label: string;
  value: number;
  severity?: GapSeverity;
}> = ({ label, value, severity }) => (
  <div style={{
    flex: 1,
    padding: 'var(--space-4)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 'var(--space-1)',
  }}>
    <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
      {value}
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', }}>
      <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{label}</span>
      {severity && <SkillGapBadge severity={severity} compact />}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MySkillMatrixPage() {
  const { data: matrixData, isLoading, refetch, isFetching } = useMySkillMatrix();
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const rows: SkillMatrixRow[] = matrixData ?? [];

  // ── Summary counts ────────────────────────────────────────────────────────
  const stats = React.useMemo(() => ({
    total:    rows.length,
    met:      rows.filter(r => r.gap_severity === 'NONE').length,
    minor:    rows.filter(r => r.gap_severity === 'MINOR').length,
    critical: rows.filter(r => r.gap_severity === 'CRITICAL').length,
    notRated: rows.filter(r => r.gap_severity === 'NOT_RATED' || !r.gap_severity).length,
  }), [rows]);

  // ── Category filter options ───────────────────────────────────────────────
  const categories = React.useMemo(() => {
    const seen = new Set<string>();
    rows.forEach(r => { if (r.category_name) seen.add(r.category_name); });
    return Array.from(seen).sort();
  }, [rows]);

  const filteredRows = categoryFilter
    ? rows.filter(r => r.category_name === categoryFilter)
    : rows;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{ height: '28px', width: '220px', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: 'var(--space-2)' }} className="skeleton" />
        <div style={{ height: '14px', width: '340px', background: 'var(--color-surface-alt)', borderRadius: '6px', marginBottom: 'var(--space-6)' }} className="skeleton" />
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ flex: 1, height: '80px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
          ))}
        </div>
        <div style={{ height: '320px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* Page header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                My Skill Matrix
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Your current skill levels vs role requirements
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                opacity: isFetching ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} strokeWidth={2} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <Link
              to="/my-tni"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--color-accent)',
                color: 'white', fontSize: '12px', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Go to Self Assessment
              <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
        <div style={{ height: '1px', background: 'var(--color-border)', marginTop: 'var(--space-4)' }} />
      </div>

      {/* No skills state */}
      {rows.length === 0 ? (
        <RatingStatusBanner
          variant="info"
          message="No skills mapped to your role yet."
          detail="Ask your admin to map skills to your job role, then complete your self-assessment."
          action={
            <Link
              to="/my-tni"
              style={{
                fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}
            >
              Self Assessment <ArrowRight size={12} />
            </Link>
          }
        />
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
            <StatCard label="Total skills" value={stats.total} />
            <StatCard label="Met"          value={stats.met}      severity="NONE" />
            <StatCard label="Minor gap"    value={stats.minor}    severity="MINOR" />
            <StatCard label="Critical gap" value={stats.critical} severity="CRITICAL" />
            <StatCard label="Not rated"    value={stats.notRated} severity="NOT_RATED" />
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              {['', ...categories].map(cat => (
                <button
                  key={cat || '__all__'}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: categoryFilter === cat ? 'var(--color-accent)' : 'var(--color-border)',
                    background: categoryFilter === cat
                      ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                      : 'var(--color-surface)',
                    color: categoryFilter === cat ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: '12px', fontWeight: categoryFilter === cat ? 600 : 400,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  {cat || 'All categories'}
                </button>
              ))}
            </div>
          )}

          {/* Gap legend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gap Legend:
            </span>
            {(['NONE', 'MINOR', 'CRITICAL', 'NOT_RATED'] as GapSeverity[]).map(s => (
              <SkillGapBadge key={s} severity={s} />
            ))}
          </div>

          {/* Matrix table */}
          <SkillMatrixTable rows={filteredRows} showCategory={!categoryFilter} />
        </>
      )}
    </div>
  );
}
