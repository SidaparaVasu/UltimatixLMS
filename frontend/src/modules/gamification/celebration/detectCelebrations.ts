import type { Badge, GamificationSummary } from '../types';
import type { CelebrationEvent, GamificationSnapshot } from './types';
import {
  DEFAULT_CELEBRATION_GIFS,
  resolveBadgeGifKey,
  tierFallbackGifKey,
  badgeTierFromCategory,
} from './celebrationAssets';

const SNAPSHOT_KEY = 'lms_gamification_snapshot';

const STREAK_MILESTONES = [7, 14, 30, 60];

const STREAK_LABELS: Record<keyof GamificationSnapshot['streaks'], string> = {
  learning: 'Learning streak',
  pass_daily: 'Daily pass streak',
  attempt_daily: 'Daily attempt streak',
  pass_consecutive: 'Pass streak',
};

export function loadGamificationSnapshot(): GamificationSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GamificationSnapshot;
  } catch {
    return null;
  }
}

export function saveGamificationSnapshot(summary: GamificationSummary, badges: Badge[]) {
  const snapshot: GamificationSnapshot = {
    lifetime_xp: summary.lifetime_xp,
    badge_codes: badges.filter((b) => b.is_earned).map((b) => b.code),
    streaks: {
      learning: summary.streaks.learning.current,
      pass_daily: summary.streaks.pass_daily.current,
      attempt_daily: summary.streaks.attempt_daily.current,
      pass_consecutive: summary.streaks.pass_consecutive.current,
    },
  };
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function detectCelebrations(
  previous: GamificationSnapshot | null,
  summary: GamificationSummary,
  catalog: Badge[],
): CelebrationEvent[] {
  if (!previous) {
    return [];
  }

  const events: CelebrationEvent[] = [];
  const xpGain = summary.lifetime_xp - previous.lifetime_xp;
  if (xpGain > 0) {
    events.push({
      id: uid(),
      type: 'xp',
      title: `+${xpGain.toLocaleString()} XP`,
      subtitle: 'Learning points added to your total',
      amount: xpGain,
      gifKey: DEFAULT_CELEBRATION_GIFS.xp,
    });
  }

  const earnedNow = catalog.filter((b) => b.is_earned);
  for (const badge of earnedNow) {
    if (!previous.badge_codes.includes(badge.code)) {
      const tier = badgeTierFromCategory(badge.category);
      events.push({
        id: uid(),
        type: 'badge',
        title: 'Badge unlocked!',
        subtitle: badge.name,
        badge: {
          code: badge.code,
          name: badge.name,
          description: badge.description,
          category: badge.category,
          icon_key: badge.icon_key,
        },
        gifKey: resolveBadgeGifKey(badge.icon_key, badge.category) || tierFallbackGifKey(tier),
      });
    }
  }

  const streakKeys = Object.keys(STREAK_LABELS) as (keyof GamificationSnapshot['streaks'])[];
  for (const key of streakKeys) {
    const current = summary.streaks[key].current;
    const prevCurrent = previous.streaks[key];
    for (const milestone of STREAK_MILESTONES) {
      if (current >= milestone && prevCurrent < milestone) {
        events.push({
          id: uid(),
          type: 'streak',
          title: `${milestone}-day streak!`,
          subtitle: STREAK_LABELS[key],
          streakLabel: STREAK_LABELS[key],
          streakDays: milestone,
          gifKey: DEFAULT_CELEBRATION_GIFS.streak,
        });
        break;
      }
    }
  }

  return events;
}
