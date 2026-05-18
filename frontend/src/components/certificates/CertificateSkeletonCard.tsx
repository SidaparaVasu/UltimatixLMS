import React from 'react';

export const CertificateSkeletonCard: React.FC = () => (
  <div style={{
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }}>
    {/* Title row */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="pulse" style={{ height: '14px', width: '65%', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)' }} />
      <div className="pulse" style={{ height: '20px', width: '80px', background: 'var(--color-surface-alt)', borderRadius: '4px' }} />
    </div>
    {/* Date row */}
    <div style={{ display: 'flex', gap: '16px' }}>
      <div className="pulse" style={{ height: '12px', width: '40%', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)' }} />
      <div className="pulse" style={{ height: '12px', width: '35%', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)' }} />
    </div>
    {/* Status badge */}
    <div className="pulse" style={{ height: '20px', width: '70px', background: 'var(--color-surface-alt)', borderRadius: '4px' }} />
    {/* Action buttons */}
    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
      <div className="pulse" style={{ height: '32px', flex: 1, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }} />
      <div className="pulse" style={{ height: '32px', flex: 1, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }} />
    </div>
  </div>
);
