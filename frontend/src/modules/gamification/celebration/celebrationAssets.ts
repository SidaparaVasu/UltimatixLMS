/**
 * Maps celebration keys to static assets under public/assets/gamification/celebrations/.
 * placeholders with production GIFs (same filenames).
 */

export type CelebrationGifTier = 'common' | 'rare' | 'epic';

const CELEBRATIONS_BASE = '/assets/gamification/celebrations';

export function celebrationGifUrl(gifKey: string): string {
  return `${CELEBRATIONS_BASE}/${gifKey}.gif`;
}

export function celebrationStaticUrl(gifKey: string): string {
  return `${CELEBRATIONS_BASE}/${gifKey}.png`;
}

export const DEFAULT_CELEBRATION_GIFS = {
  xp: 'xp-earned',
  streak: 'streak-milestone',
  badgeDefault: 'badge-default',
  generic: 'generic-common',
} as const;

/** Badge-specific GIF when available; otherwise category tier. */
export function resolveBadgeGifKey(iconKey: string, category: string): string {
  const normalized = (iconKey || 'badge-default').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `badge-${normalized}`;
}

export function badgeTierFromCategory(category: string): CelebrationGifTier {
  if (category === 'milestone' || category === 'certificates') return 'epic';
  if (category === 'assessment' || category === 'skills' || category === 'compliance') {
    return 'rare';
  }
  return 'common';
}

export function tierFallbackGifKey(tier: CelebrationGifTier): string {
  return `tier-${tier}`;
}
