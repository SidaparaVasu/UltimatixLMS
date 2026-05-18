import React from 'react';

interface CertificateStatusBadgeProps {
  status: 'active' | 'expired' | 'revoked' | 'expiring_soon';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A standardized pill badge for displaying certificate status.
 * Uses inline styles with CSS color-mix for colour coding.
 */
export const CertificateStatusBadge: React.FC<CertificateStatusBadgeProps> = ({
  status,
  className,
  style,
}) => {
  const getColors = (): { background: string; border: string; color: string } => {
    switch (status) {
      case 'active':
        return {
          background: 'color-mix(in srgb, #22c55e 10%, transparent)',
          border: '1px solid color-mix(in srgb, #22c55e 30%, transparent)',
          color: '#16a34a',
        };
      case 'expiring_soon':
        return {
          background: 'color-mix(in srgb, #f59e0b 10%, transparent)',
          border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)',
          color: '#d97706',
        };
      case 'expired':
        return {
          background: 'color-mix(in srgb, #ef4444 10%, transparent)',
          border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
          color: '#dc2626',
        };
      case 'revoked':
        return {
          background: 'color-mix(in srgb, #94a3b8 10%, transparent)',
          border: '1px solid color-mix(in srgb, #94a3b8 30%, transparent)',
          color: '#64748b',
        };
    }
  };

  const getLabel = (): string => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expiring_soon':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      case 'revoked':
        return 'Revoked';
    }
  };

  const colors = getColors();

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        ...colors,
        ...style,
      }}
    >
      {getLabel()}
    </span>
  );
};
