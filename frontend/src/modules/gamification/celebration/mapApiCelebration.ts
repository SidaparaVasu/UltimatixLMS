import type { CelebrationEventApi, GamificationSnapshotPayload } from '../types';
import type { CelebrationEvent, GamificationSnapshot } from './types';
import { loadGamificationSnapshot } from './detectCelebrations';

const SNAPSHOT_KEY = 'lms_gamification_snapshot';

export function mapApiCelebrationEvent(api: CelebrationEventApi): CelebrationEvent {
  return {
    id: api.id,
    type: api.type,
    title: api.title,
    subtitle: api.subtitle,
    amount: api.amount,
    badge: api.badge
      ? {
          code: api.badge.code,
          name: api.badge.name,
          description: api.badge.description,
          category: api.badge.category,
          icon_key: api.badge.icon_key,
        }
      : undefined,
    streakLabel: api.streak_label,
    streakDays: api.streak_days,
    gifKey: api.gif_key,
  };
}

export function applyServerSnapshot(snapshot: GamificationSnapshotPayload): void {
  const stored: GamificationSnapshot = {
    lifetime_xp: snapshot.lifetime_xp,
    badge_codes: snapshot.badge_codes,
    streaks: snapshot.streaks,
    celebrated_streak_milestones: snapshot.celebrated_streak_milestones ?? [],
  };
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(stored));
}

export function readSessionSnapshotForAck(): GamificationSnapshotPayload | undefined {
  const current = loadGamificationSnapshot();
  if (!current) return undefined;
  return {
    lifetime_xp: current.lifetime_xp,
    badge_codes: current.badge_codes,
    streaks: current.streaks,
    celebrated_streak_milestones: current.celebrated_streak_milestones ?? [],
  };
}
