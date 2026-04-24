import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { TeamMember } from '@/types/dashboard.types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface TeamCompletionChartProps {
  members: TeamMember[];
  isLoading: boolean;
}

export const TeamCompletionChart: React.FC<TeamCompletionChartProps> = ({ members, isLoading }) => {
  if (isLoading) {
    return (
      <div className="chart-panel">
        <div className="section-header">
          <span className="section-title">Team Completion</span>
        </div>
        <div className="pulse" style={{ height: 200, background: 'var(--color-border)', borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="chart-panel">
        <div className="section-header">
          <span className="section-title">Team Completion</span>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          No team members found.
        </div>
      </div>
    );
  }

  // Truncate long names for chart labels
  const labels = members.map((m) => {
    const parts = m.employee_name.split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : m.employee_name;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Completion %',
        data: members.map((m) => m.completion_percentage),
        backgroundColor: 'oklch(0.5461 0.2152 262.8809 / 0.75)',
        borderColor: 'oklch(0.5461 0.2152 262.8809)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          callback: (v: any) => `${v}%`,
          font: { family: 'DM Sans', size: 11 },
          color: 'var(--color-text-muted)',
        },
        grid: { color: 'var(--color-border)' },
      },
      y: {
        ticks: {
          font: { family: 'DM Sans', size: 11 },
          color: 'var(--color-text-secondary)',
        },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.raw}% completion`,
        },
      },
    },
  };

  const chartHeight = Math.max(160, members.length * 36);

  return (
    <div className="chart-panel">
      <div className="section-header">
        <span className="section-title">Team Completion</span>
      </div>
      <div style={{ height: chartHeight }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};
