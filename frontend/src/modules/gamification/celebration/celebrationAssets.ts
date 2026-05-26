/**
 * Maps celebration keys to assets under public/assets/gamification/celebrations/.
 * Drop in production GIFs/PNGs using the same filenames.
 */

import { BADGE_CELEBRATION_GIF_OVERRIDES } from '../constants/badgeCatalog';

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

function normalizeIconKey(iconKey: string): string {
  return (iconKey || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

/**
 * Badge-specific GIF when a file is mapped under celebrations/; otherwise tier GIF.
 * Add optional `badge-{icon_key}.gif` files to override tier defaults.
 */
export function resolveBadgeGifKey(iconKey: string, category: string): string {
  const key = normalizeIconKey(iconKey);
  if (key && BADGE_CELEBRATION_GIF_OVERRIDES[key]) {
    return BADGE_CELEBRATION_GIF_OVERRIDES[key]!;
  }
  return tierFallbackGifKey(badgeTierFromCategory(category));
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
