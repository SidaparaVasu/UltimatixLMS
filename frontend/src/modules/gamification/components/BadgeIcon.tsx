import { useMemo, useState } from 'react';
import type { Badge } from '../types';
import { badgeImageSources } from '../assets/badgeAssets';
import { badgeVisual } from '../utils/badgeVisual';

interface BadgeIconProps {
  badge: Pick<Badge, 'code' | 'category' | 'name'>;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders badge art from public/assets/gamification/badges/{code}.png|.svg
 * with Lucide category fallback when files are missing.
 */
export const BadgeIcon: React.FC<BadgeIconProps> = ({
  badge,
  size = 48,
  className,
  style,
}) => {
  const sources = useMemo(() => badgeImageSources(badge), [badge.code]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const visual = badgeVisual(badge);
  const Icon = visual.icon;

  const imgSrc = sourceIndex < sources.length ? sources[sourceIndex] : null;

  if (!imgSrc) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(8, size * 0.25),
          background: visual.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...style,
        }}
        aria-hidden
      >
        <Icon size={size * 0.5} color={visual.color} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt=""
      role="presentation"
      className={className}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        ...style,
      }}
      onError={() => setSourceIndex((i) => i + 1)}
    />
  );
};
