import React from 'react';
import { CheckCircle, Clock, AlertCircle, Info } from 'lucide-react';

type BannerVariant = 'submitted' | 'draft' | 'pending_manager' | 'info';

interface RatingStatusBannerProps {
  variant: BannerVariant;
  /** Primary message shown in the banner */
  message: string;
  /** Optional secondary detail line */
  detail?: string;
  /** Optional action slot (e.g. a link or button) */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

const variantConfig: Record<BannerVariant, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  submitted: {
    icon: CheckCircle,
    color: '#15803d',
    bg: 'rgba(26,158,58,0.07)',
    border: 'rgba(26,158,58,0.25)',
  },
  draft: {
    icon: Clock,
    color: '#b45309',
    bg: 'rgba(217,119,6,0.07)',
    border: 'rgba(217,119,6,0.25)',
  },
  pending_manager: {
    icon: AlertCircle,
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.07)',
    border: 'rgba(37,99,235,0.20)',
  },
  info: {
    icon: Info,
    color: 'var(--color-text-secondary)',
    bg: 'var(--color-surface-alt)',
    border: 'var(--color-border)',
  },
};

/**
 * RatingStatusBanner
 *
 * A full-width contextual banner shown at the top of rating pages to
 * communicate the current state of the TNI cycle to the user.
 *
 * Variants:
 *   submitted       — green, self-rating submitted, awaiting manager
 *   draft           — amber, unsaved / in-progress draft
 *   pending_manager — blue, manager review in progress
 *   info            — neutral, general information
 */
export const RatingStatusBanner: React.FC<RatingStatusBannerProps> = ({
  variant,
  message,
  detail,
  action,
  style,
}) => {
  const c = variantConfig[variant];
  const Icon = c.icon;

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        background: c.bg,
        border: `1px solid ${c.border}`,
        marginBottom: 'var(--space-5)',
        ...style,
      }}
    >
      {/* Icon */}
      <Icon
        size={18}
        strokeWidth={2}
        style={{ color: c.color, flexShrink: 0, marginTop: '1px' }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: c.color,
            lineHeight: 1.4,
          }}
        >
          {message}
        </p>
        {detail && (
          <p
            style={{
              margin: '3px 0 0',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
            }}
          >
            {detail}
          </p>
        )}
      </div>

      {/* Action slot */}
      {action && (
        <div style={{ flexShrink: 0, alignSelf: 'center' }}>
          {action}
        </div>
      )}
    </div>
  );
};
