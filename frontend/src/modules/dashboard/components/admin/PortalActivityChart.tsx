import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useActivityChart } from '@/queries/dashboard/useDashboardQueries';
import type { ActivityChartFilter } from '@/types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const FILTERS: { id: ActivityChartFilter; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'annual', label: 'Annual' },
];

// Colour tokens for the three series
const COLORS = {
  completions:  { line: 'oklch(0.63 0.17 155)',  fill: 'oklch(0.63 0.17 155 / 0.08)'  },
  enrollments:  { line: 'oklch(0.5461 0.2152 262.8809)', fill: 'oklch(0.5461 0.2152 262.8809 / 0.08)' },
  certificates: { line: 'oklch(0.72 0.19 55)',   fill: 'oklch(0.72 0.19 55 / 0.08)'   },
};

export const PortalActivityChart: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<ActivityChartFilter>('monthly');
  const { data: chartData, isLoading } = useActivityChart(activeFilter);

  const labels       = chartData?.data?.map((d) => d.label) ?? [];
  const completions  = chartData?.data?.map((d) => d.course_completions) ?? [];
  const enrollments  = chartData?.data?.map((d) => d.new_enrollments) ?? [];
  const certificates = chartData?.data?.map((d) => d.certificates_issued) ?? [];

  const data = {
    labels,
    datasets: [
      {
        label: 'Completions',
        data: completions,
        borderColor: COLORS.completions.line,
        backgroundColor: COLORS.completions.fill,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: COLORS.completions.line,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'New Enrollments',
        data: enrollments,
        borderColor: COLORS.enrollments.line,
        backgroundColor: COLORS.enrollments.fill,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: COLORS.enrollments.line,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Certificates',
        data: certificates,
        borderColor: COLORS.certificates.line,
        backgroundColor: COLORS.certificates.fill,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: COLORS.certificates.line,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { font: { family: 'DM Sans', size: 11 }, color: 'var(--color-text-muted)' },
        grid: { color: 'var(--color-border)' },
      },
      y: {
        beginAtZero: true,
        ticks: { font: { family: 'DM Sans', size: 11 }, color: 'var(--color-text-muted)' },
        grid: { color: 'var(--color-border)' },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { family: 'DM Sans', size: 11 },
          color: 'var(--color-text-secondary)',
          boxWidth: 12,
        },
      },
      tooltip: { mode: 'index' as const, intersect: false },
    },
  };

  return (
    <div className="chart-panel">
      <div className="section-header" style={{ marginBottom: 'var(--space-4)' }}>
        <span className="section-title">Learning Activity</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'all 150ms',
                background: activeFilter === f.id ? 'var(--color-accent)' : 'transparent',
                borderColor: activeFilter === f.id ? 'var(--color-accent)' : 'var(--color-border)',
                color: activeFilter === f.id ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="pulse" style={{ height: 220, background: 'var(--color-border)', borderRadius: 'var(--radius-md)' }} />
      ) : (
        <div style={{ height: 220 }}>
          <Line data={data} options={options} />
        </div>
      )}
    </div>
  );
};
