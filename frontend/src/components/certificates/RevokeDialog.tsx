import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface RevokeDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Function to close the dialog */
  onClose: () => void;
  /** Function to execute on confirmation, receives the trimmed reason */
  onConfirm: (reason: string) => void;
  /** Whether the revoke action is currently processing */
  isLoading: boolean;
  /** API error message to display inline, or null when no error */
  error: string | null;
}

const MAX_REASON_LENGTH = 500;

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
/**
 * RevokeDialog — modal for revoking a certificate with a required reason.
 *
 * - Resets the reason field each time the dialog is opened.
 * - Submit is disabled when reason is empty or while loading.
 * - API errors are displayed inline without closing the dialog.
 */
export const RevokeDialog: React.FC<RevokeDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  error,
}) => {
  const [reason, setReason] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleSubmit = () => {
    if (reason.trim()) onConfirm(reason.trim());
  };

  const isSubmitDisabled = !reason.trim() || isLoading;

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
      <button
        onClick={onClose}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'white',
          color: 'var(--color-text-primary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          transition: 'all 150ms',
        }}
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--color-danger)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
          opacity: isSubmitDisabled ? 0.5 : 1,
          transition: 'opacity 150ms',
        }}
      >
        {isLoading ? 'Revoking...' : 'Revoke Certificate'}
      </button>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v && !isLoading) onClose(); }}
      title="Revoke Certificate"
      description="This action cannot be undone. Please provide a reason for revoking this certificate."
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label
          htmlFor="revoke-reason"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Reason for revocation
        </label>

        <textarea
          id="revoke-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
          placeholder="Enter the reason for revoking this certificate..."
          rows={4}
          maxLength={MAX_REASON_LENGTH}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'var(--color-text-primary)',
            background: isLoading ? 'var(--color-surface)' : 'white',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms',
            fontFamily: 'inherit',
          }}
        />

        {/* Character counter */}
        <span
          style={{
            fontSize: '12px',
            color: reason.length >= MAX_REASON_LENGTH
              ? 'var(--color-danger)'
              : 'var(--color-text-muted)',
            textAlign: 'right',
          }}
        >
          {reason.length}/{MAX_REASON_LENGTH}
        </span>

        {/* Inline error message */}
        {error && (
          <p
            style={{
              color: 'var(--color-danger)',
              fontSize: '13px',
              margin: '4px 0 0',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
};
