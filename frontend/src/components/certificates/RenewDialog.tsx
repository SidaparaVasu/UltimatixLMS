import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { CertificateAdminRecord } from '@/types/certificate.types';

interface RenewDialogProps {
  open: boolean;
  certificate: CertificateAdminRecord | null;
  onClose: () => void;
  onConfirm: (expiryDate: string, reason: string) => void;
  isLoading: boolean;
  error: string | null;
}

const MAX_REASON_LENGTH = 500;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No expiry';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const RenewDialog: React.FC<RenewDialogProps> = ({
  open,
  certificate,
  onClose,
  onConfirm,
  isLoading,
  error,
}) => {
  const minDate = useMemo(() => toDateInputValue(addDays(new Date(), 1)), []);
  const [expiryDate, setExpiryDate] = useState(minDate);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setExpiryDate(minDate);
      setReason('');
    }
  }, [open, minDate]);

  const isSubmitDisabled = !expiryDate || expiryDate < minDate || isLoading;

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
        }}
      >
        Cancel
      </button>
      <button
        onClick={() => onConfirm(expiryDate, reason.trim())}
        disabled={isSubmitDisabled}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 600,
          cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
          opacity: isSubmitDisabled ? 0.5 : 1,
        }}
      >
        {isLoading ? 'Renewing...' : 'Renew Certificate'}
      </button>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v && !isLoading) onClose(); }}
      title="Renew Certificate"
      description="Set a new future expiry date. Previous expiry dates are kept in renewal history."
      footer={footer}
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {certificate && (
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              background: 'var(--color-surface)',
              display: 'grid',
              gap: '6px',
            }}
          >
            <strong style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
              {certificate.course_or_assessment_name}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Current expiry: {formatDate(certificate.expiry_date)}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="renew-expiry-date" style={{ fontSize: '13px', fontWeight: 500 }}>
            New expiry date
          </label>
          <input
            id="renew-expiry-date"
            type="date"
            className="form-input"
            min={minDate}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="renew-reason" style={{ fontSize: '13px', fontWeight: 500 }}>
            Renewal note
          </label>
          <textarea
            id="renew-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
            placeholder="Optional note for renewal history..."
            rows={3}
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
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>
            {reason.length}/{MAX_REASON_LENGTH}
          </span>
        </div>

        {!!certificate?.renewal_logs?.length && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Renewal history</span>
            <div style={{ display: 'grid', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {certificate.renewal_logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <div>
                    {formatDate(log.previous_expiry_date)} to {formatDate(log.new_expiry_date)}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {formatDate(log.renewed_at)} by {log.renewed_by_name || log.renewed_by_code || 'Unknown'}
                  </div>
                  {log.reason && <div style={{ marginTop: '6px' }}>{log.reason}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
};
