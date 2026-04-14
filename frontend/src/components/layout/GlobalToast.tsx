import React, { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

export const GlobalToast: React.FC = () => {
  const { notification, clearNotification } = useNotificationStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const borderColors = {
    success: 'border-l-success',
    error: 'border-l-destructive',
    warning: 'border-l-warning',
    info: 'border-l-blue-500',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={cn(
          "min-w-[320px] max-w-md bg-card/80 backdrop-blur-md border border-slate-200/50 rounded-lg shadow-lg border-l-4 p-4 flex gap-3 items-start",
          borderColors[notification.type]
        )}
      >
        <div className="flex-shrink-0 mt-0.5">
          {icons[notification.type]}
        </div>
        
        <div className="flex-grow">
          <p className="text-sm font-medium text-foreground leading-snug">
            {notification.message}
          </p>
        </div>

        <button
          onClick={clearNotification}
          className="flex-shrink-0 text-slate-400 hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
