import React from 'react';
import { AlertCircle } from 'lucide-react';

interface GamificationErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const GamificationErrorState: React.FC<GamificationErrorStateProps> = ({
  title = 'Could not load gamification',
  description = 'Something went wrong while fetching your progress. Please try again.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center text-center px-6 py-12">
    <div
      className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
      style={{ background: '#FEF2F2' }}
    >
      <AlertCircle size={28} strokeWidth={1.5} className="text-red-500" />
    </div>
    <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
    <p className="text-sm text-gray-500 max-w-md mb-4">{description}</p>
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Try again
      </button>
    ) : null}
  </div>
);
