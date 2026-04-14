import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface ConfirmationDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Function to close the dialog */
  onClose: () => void;
  /** Function to execute on confirmation */
  onConfirm: () => void;
  /** Primary heading */
  title: string;
  /** Descriptive body text */
  description: string;
  /** Text for the confirm button */
  confirmLabel: string;
  /** Visual style: 'danger' (red), 'warning' (orange), or 'primary' (blue) */
  variant?: 'danger' | 'warning' | 'primary';
  /** Whether the confirm action is currently processing */
  isLoading?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * ConfirmationDialog — a compact, reusable modal for critical user actions.
 * 
 * Specifically designed to be height-efficient and distinct from the 
 * full-page entry Dialogs.
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  isLoading = false,
}) => {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [open]);

  if (!open) return null;

  return (
    <div 
      className="anim"
      style={{ 
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', animationDuration: '200ms'
      }}
      onClick={onClose}
    >
      <div 
        className="anim delay-1"
        style={{ 
          width: '100%', maxWidth: '440px', 
          background: 'white', 
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04)',
          position: 'relative', overflow: 'hidden', animationDuration: '300ms',
          display: 'flex', flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)', 
          background: 'var(--color-surface)' 
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: 'var(--color-text-muted)', display: 'flex', padding: 0 
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content with Icon */}
        <div style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: variant === 'danger' ? 'color-mix(in srgb, var(--color-danger) 10%, transparent)' : variant === 'warning' ? 'color-mix(in srgb, #f59e0b 10%, transparent)' : 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: variant === 'danger' ? 'var(--color-danger)' : variant === 'warning' ? '#f59e0b' : 'var(--color-accent)'
          }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: 0 }}>
              {description}
            </p>
          </div>
        </div>

        {/* Compact Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            onClick={onClose}
            disabled={isLoading}
            style={{ 
              padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              background: 'white', color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              transition: 'all 150ms'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            style={{ 
              padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none',
              background: variant === 'danger' ? 'var(--color-danger)' : variant === 'warning' ? '#f59e0b' : 'var(--color-accent)',
              color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 150ms'
            }}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
