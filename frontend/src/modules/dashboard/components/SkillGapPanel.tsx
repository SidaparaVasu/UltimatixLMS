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

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const data = {
  labels: ['Python/SQL', 'Cloud', 'Project Mgmt', 'Communication', 'Data Viz'],
  datasets: [
    {
      label: 'Required',
      data: [5, 4, 4, 5, 4],
      backgroundColor: 'rgba(232, 131, 58, 0.12)',
      borderColor: '#E8833A',
      borderWidth: 2,
      pointBackgroundColor: '#E8833A',
      pointRadius: 3,
    },
    {
      label: 'Current',
      data: [3.5, 2, 4, 5, 2],
      backgroundColor: 'rgba(28, 42, 58, 0.12)',
      borderColor: 'rgba(28, 42, 58, 0.7)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(28, 42, 58, 0.8)',
      pointRadius: 3,
    },
  ],
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
        font: { family: 'DM Sans', size: 11, weight: '500' },
        color: '#5C6478',
      },
    },
  },
  plugins: {
    legend: { display: false },
  },
  maintainAspectRatio: true,
  responsive: true,
};

const skills = [
  { name: 'Python / SQL', req: 'Advanced', curr: 'Intermediate', progress: 70, color: 'var(--color-accent)' },
  { name: 'Cloud (AWS)', req: 'Intermediate', curr: 'Basic', progress: 30, color: 'var(--color-warning)' },
  { name: 'Project Mgmt', req: 'Intermediate', curr: 'Intermediate', progress: 100, color: 'var(--color-success)' },
  { name: 'Communication', req: 'Advanced', curr: 'Advanced', progress: 100, color: 'var(--color-success)' },
  { name: 'Data Viz', req: 'Intermediate', curr: 'Basic', progress: 40, color: 'var(--color-danger)' },
];

export const SkillGapPanel: React.FC = () => {
  return (
    <div className="chart-panel">
      <div className="section-header">
        <span className="section-title">Skill Gap Analysis</span>
        <a href="#" className="section-link">Full matrix</a>
      </div>
      <div className="skill-gap-inner">
        <div className="chart-canvas-wrap">
          <Radar data={data} options={options as any} />
          <div className="chart-legend">
            <div className="chart-legend-item">
              <span className="legend-dot legend-required" /> Required
            </div>
            <div className="chart-legend-item">
              <span className="legend-dot legend-current" /> Current
            </div>
          </div>
        </div>
        
        <div className="skill-list">
          {skills.map((skill) => (
            <div key={skill.name} className="skill-row">
              <div className="skill-row-top">
                <span className="skill-name">{skill.name}</span>
                <div className="skill-badges">
                  <span className="skill-badge badge-required">{skill.req}</span>
                  <span className="skill-badge badge-current">{skill.curr}</span>
                </div>
              </div>
              <div className="skill-gap-bar">
                <div 
                  className="skill-gap-fill" 
                  style={{ width: `${skill.progress}%`, background: skill.color }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
