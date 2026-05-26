import type { Badge } from '../types';

export const BADGES_ASSET_BASE = '/assets/gamification/badges';

/** Production PNG path (512×512 transparent recommended). */
export function badgePngUrl(code: string): string {
  return `${BADGES_ASSET_BASE}/${code}.png`;
}

/** SVG placeholder path (generated until PNGs exist). */
export function badgeSvgUrl(code: string): string {
  return `${BADGES_ASSET_BASE}/${code}.svg`;
}

/** Ordered sources: prefer PNG, then SVG, then UI falls back to Lucide. */
export function badgeImageSources(badge: Pick<Badge, 'code'>): string[] {
  return [badgePngUrl(badge.code), badgeSvgUrl(badge.code)];
}
