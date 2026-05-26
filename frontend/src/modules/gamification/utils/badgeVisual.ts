import {
  Award,
  Shield,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Badge } from '../types';

export const BADGE_VISUAL: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  learning: { icon: Zap, color: '#E8833A', bg: '#FDF1E8' },
  compliance: { icon: Shield, color: '#2E8B5E', bg: '#E8F5EE' },
  assessment: { icon: Target, color: '#2870B8', bg: '#EBF5FF' },
  skills: { icon: Star, color: '#7C3AED', bg: '#F3EDFF' },
  certificates: { icon: Award, color: '#B45309', bg: '#FEF3C7' },
  streak: { icon: Trophy, color: '#E8833A', bg: '#FDF1E8' },
  milestone: { icon: Trophy, color: '#2870B8', bg: '#EBF5FF' },
};

const DEFAULT_BADGE_VISUAL = { icon: Award, color: '#64748B', bg: '#F1F5F9' };

export function badgeVisual(badge: Pick<Badge, 'category'>) {
  return BADGE_VISUAL[badge.category] ?? DEFAULT_BADGE_VISUAL;
}
