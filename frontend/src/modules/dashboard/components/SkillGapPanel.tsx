import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useMySkillMatrix } from '@/queries/dashboard/useDashboardQueries';
import type { SkillMatrixRow } from '@/types/dashboard.types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const GAP_COLOR: Record<string, string> = {
  NONE:     'var(--color-success)',
  MINOR:    'var(--color-warning)',
  CRITICAL: 'var(--color-danger)',
  NOT_RATED:'var(--color-text-muted)',
};

const options = {
  scales: {
    r: {
      min: 0,
      max: 5,
      ticks: { display: false, stepSize: 1 },
      grid: { color: 'rgba(226, 224, 216, 0.8)' },
      angleLines: { color: 'rgba(226, 224, 216, 0.6)' },
      pointLabels: {
        font: { family: 'DM Sans', size: 11, weight: '500' as const },
        color: '#5C6478',
      },
    },
  },
  plugins: { legend: { display: false } },
  maintainAspectRatio: true,
  responsive: true,
};

/* ── Skeleton ── */
const SkeletonPanel: React.FC = () => (
  <div className="chart-panel">
    <div className="section-header">
      <span className="section-title">Skill Gap Analysis</span>
    </div>
    <div className="pulse" style={{ height: 200, background: 'var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
    {[1, 2, 3].map((i) => (
      <div key={i} className="pulse" style={{ height: 36, background: 'var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }} />
    ))}
  </div>
);

/* ── Empty state ── */
const EmptyPanel: React.FC = () => (
  <div className="chart-panel">
    <div className="section-header">
      <span className="section-title">Skill Gap Analysis</span>
      <a href="/my-skills" className="section-link">Full matrix</a>
    </div>
    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
      No skill requirements defined for your role yet.
    </div>
  </div>
);

export const SkillGapPanel: React.FC = () => {
  const { data: matrix, isLoading } = useMySkillMatrix();

  if (isLoading) return <SkeletonPanel />;

  // Only show skills that have a required level defined
  const rows: SkillMatrixRow[] = (matrix ?? []).filter((r) => r.required_level);

  if (rows.length === 0) return <EmptyPanel />;

  // Cap radar at 8 skills to keep it readable
  const radarRows = rows.slice(0, 8);

  const radarData = {
    labels: radarRows.map((r) => r.skill_name),
    datasets: [
      {
        label: 'Required',
        data: radarRows.map((r) => r.required_level?.level_rank ?? 0),
        backgroundColor: 'rgba(58, 142, 232, 0.12)',
        borderColor: 'oklch(0.5461 0.2152 262.8809)',
        borderWidth: 2,
        pointBackgroundColor: 'oklch(0.5461 0.2152 262.8809)',
        pointRadius: 3,
      },
      {
        label: 'Current',
        data: radarRows.map((r) => r.current_level?.level_rank ?? 0),
        backgroundColor: 'rgba(28, 42, 58, 0.12)',
        borderColor: 'rgba(28, 42, 58, 0.7)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(28, 42, 58, 0.8)',
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="chart-panel">
      <div className="section-header">
        <span className="section-title">Skill Gap Analysis</span>
        <a href="/my-skills" className="section-link">Full matrix</a>
      </div>

      <div className="skill-gap-inner">
        {/* Radar chart */}
        <div className="chart-canvas-wrap">
          <Radar data={radarData} options={options as any} />
          <div className="chart-legend">
            <div className="chart-legend-item">
              <span className="legend-dot legend-required" /> Required
            </div>
            <div className="chart-legend-item">
              <span className="legend-dot legend-current" /> Current
            </div>
          </div>
        </div>

        {/* Skill list */}
        <div className="skill-list">
          {rows.map((row) => {
            const severity = row.gap_severity ?? 'NOT_RATED';
            const barColor = GAP_COLOR[severity] ?? 'var(--color-text-muted)';
            // Progress = current_rank / required_rank * 100, capped at 100
            const reqRank  = row.required_level?.level_rank ?? 1;
            const currRank = row.current_level?.level_rank ?? 0;
            const progress = Math.min(100, Math.round((currRank / reqRank) * 100));

            return (
              <div key={row.skill_id} className="skill-row">
                <div className="skill-row-top">
                  <span className="skill-name">{row.skill_name}</span>
                  <div className="skill-badges">
                    <span className="skill-badge badge-required">
                      {row.required_level?.level_name ?? '—'}
                    </span>
                    <span className="skill-badge badge-current">
                      {row.current_level?.level_name ?? 'Not Rated'}
                    </span>
                  </div>
                </div>
                <div className="skill-gap-bar">
                  <div
                    className="skill-gap-fill"
                    style={{ width: `${progress}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
