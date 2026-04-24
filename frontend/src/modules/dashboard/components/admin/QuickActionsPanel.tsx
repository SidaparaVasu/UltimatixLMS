import React from 'react';
import { UserPlus, BookPlus, Settings, BarChart2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  path: string;
  color: string;
  bg: string;
}

const ACTIONS: QuickAction[] = [
  { label: 'Add User', icon: UserPlus, path: '/admin/employees', color: 'oklch(0.5461 0.2152 262.8809)', bg: 'oklch(0.5461 0.2152 262.8809 / 0.08)' },
  { label: 'Add Course', icon: BookPlus, path: '/admin/courses', color: 'oklch(0.5461 0.2152 262.8809)', bg: 'oklch(0.5461 0.2152 262.8809 / 0.08)' },
  { label: 'Reports', icon: BarChart2, path: '/admin/reports', color: 'oklch(0.5461 0.2152 262.8809)', bg: 'oklch(0.5461 0.2152 262.8809 / 0.08)' },
  { label: 'Roles', icon: Users, path: '/admin/roles', color: 'oklch(0.5461 0.2152 262.8809)', bg: 'oklch(0.5461 0.2152 262.8809 / 0.08)' },
  { label: 'Portal Settings', icon: Settings, path: '/admin/settings', color: 'oklch(0.5461 0.2152 262.8809)', bg: 'oklch(0.5461 0.2152 262.8809 / 0.08)' },
];

export const QuickActionsPanel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="chart-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <div className="section-header" style={{ marginBottom: 0 }}>
        <span className="section-title">Quick Actions</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-canvas)',
              cursor: 'pointer',
              transition: 'all 150ms',
              textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = action.bg;
              e.currentTarget.style.borderColor = action.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-canvas)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-md)',
                background: action.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: action.color,
              }}
            >
              <action.icon size={16} />
            </div>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
