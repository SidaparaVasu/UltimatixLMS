import type { Badge } from '../types';

export type CelebrationEventType = 'xp' | 'badge' | 'streak';

export interface CelebrationBadgePayload {
  code: string;
  name: string;
  description: string;
  category: string;
  icon_key: string;
}

export interface CelebrationEvent {
  id: string;
  type: CelebrationEventType;
  title: string;
  subtitle?: string;
  amount?: number;
  badge?: CelebrationBadgePayload;
  streakLabel?: string;
  streakDays?: number;
  /** Filename without extension under /assets/gamification/celebrations/ */
  gifKey?: string;
}

export interface GamificationSnapshot {
  lifetime_xp: number;
  badge_codes: string[];
  streaks: {
    learning: number;
    pass_daily: number;
    attempt_daily: number;
    pass_consecutive: number;
  };
}
