import React from 'react';

interface CertificateTypeBadgeProps {
  type: 'course' | 'assessment';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A pill badge for displaying certificate types.
 * Uses inline styles with CSS variables — no Tailwind classes.
 */
export const CertificateTypeBadge: React.FC<CertificateTypeBadgeProps> = ({
  type,
  className,
  style,
}) => {
  const getColors = () => {
    switch (type) {
      case 'course':
        return {
          background: 'color-mix(in srgb, #3b82f6 10%, transparent)',
          border: '1px solid color-mix(in srgb, #3b82f6 30%, transparent)',
          color: '#2563eb',
          label: 'Course',
        };
      case 'assessment':
        return {
          background: 'color-mix(in srgb, #3b82f6 10%, transparent)',
          border: '1px solid color-mix(in srgb, #3b82f6 30%, transparent)',
          color: '#2563eb',
          label: 'Assessment',
        };
    }
  };

  const { label, ...colors } = getColors();

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
      {label}
    </span>
  );
};
