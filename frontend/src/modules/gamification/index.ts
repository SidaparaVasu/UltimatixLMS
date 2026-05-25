export { LeaderboardPage } from './pages/LeaderboardPage';
export { GamificationProfilePage } from './pages/GamificationProfilePage';
export { TeamGamificationPage } from './pages/TeamGamificationPage';
export { TeamGamificationPanel } from './components/TeamGamificationPanel';
export { CelebrationQueueProvider, useCelebrationQueue } from './context/CelebrationQueueProvider';
export { CelebrationModal } from './components/CelebrationModal';
export type { CelebrationEvent, CelebrationEventType } from './celebration/types';
export { useGamificationEnabled } from './hooks/useGamificationEnabled';
export {
  useGamificationSummary,
  useGamificationTransactions,
  useGamificationLeaderboard,
  useGamificationBadgeCatalog,
  useGamificationMyBadges,
  useGamificationTeamList,
  useGamificationTeamMember,
  useGamificationTeamQueryEnabled,
  useGamificationQueryEnabled,
} from './hooks/useGamificationQueries';
import { GAMIFICATION_QUERY_KEYS } from './hooks/query-keys';
export { GAMIFICATION_QUERY_KEYS };
export { gamificationApi } from './api/gamification-api';
export { GAMIFICATION_API_BASE, GAMIFICATION_FEATURE_KEY } from './constants';
export { BadgeIcon } from './components/BadgeIcon';
export { GamificationEmptyState } from './components/GamificationEmptyState';
export { BADGE_CATALOG_CODES } from './constants/badgeCatalog';
export { badgeImageSources, badgePngUrl, badgeSvgUrl, BADGES_ASSET_BASE } from './assets/badgeAssets';
export { GamificationErrorState } from './components/GamificationErrorState';
export { GamificationQueryState } from './components/GamificationQueryState';
export type {
  GamificationHealthResponse,
  GamificationSummary,
  PointTransaction,
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardParams,
  LeaderboardPeriod,
  Badge,
  BadgeCatalogResponse,
  Streaks,
  StreakSnapshot,
  GamificationPaginated,
  TransactionListParams,
  TeamGamificationMember,
  TeamGamificationDetail,
  TeamListParams,
} from './types';

/** @deprecated Use GAMIFICATION_QUERY_KEYS.health */
export const GAMIFICATION_STATUS_QUERY_KEY = GAMIFICATION_QUERY_KEYS.health;
