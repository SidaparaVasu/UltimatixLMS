import React from 'react';
import { Trophy } from 'lucide-react';

interface GamificationEmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const GamificationEmptyState: React.FC<GamificationEmptyStateProps> = ({
  title = 'No gamification data yet',
  description = 'Complete courses and assessments to earn XP, badges, and streaks.',
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center px-6 py-12">
    <div
      className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
      style={{ background: 'var(--color-surface-elevated, #f0f4f8)' }}
    >
      <Trophy size={28} strokeWidth={1.5} style={{ color: '#E8833A' }} />
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
    <p className="text-sm text-gray-500 max-w-md mb-4">{description}</p>
    {action}
  </div>
);
