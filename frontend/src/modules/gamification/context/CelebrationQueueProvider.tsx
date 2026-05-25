import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { gamificationApi } from '../api/gamification-api';
import {
  detectCelebrations,
  loadGamificationSnapshot,
  saveGamificationSnapshot,
} from '../celebration/detectCelebrations';
import type { CelebrationEvent } from '../celebration/types';
import { CelebrationModal } from '../components/CelebrationModal';
import { GAMIFICATION_QUERY_KEYS } from '../hooks/query-keys';
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';
import type { GamificationSummary } from '../types';
import type { Badge } from '../types';

interface CelebrationQueueContextValue {
  enqueue: (events: CelebrationEvent[]) => void;
  /** Refetch summary + catalog, diff vs session snapshot, queue new celebrations. */
  checkForCelebrations: () => Promise<void>;
  /** Seed snapshot without showing modals (e.g. after dashboard load). */
  syncSnapshot: () => Promise<void>;
}

const CelebrationQueueContext = createContext<CelebrationQueueContextValue | null>(null);

function syncQueryCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  summary: GamificationSummary,
  catalogResults: Badge[],
  earnedBadges: Badge[],
) {
  queryClient.setQueryData(GAMIFICATION_QUERY_KEYS.summary, summary);
  queryClient.setQueryData(GAMIFICATION_QUERY_KEYS.myBadges, earnedBadges);
  queryClient.setQueryData(GAMIFICATION_QUERY_KEYS.badgeCatalog, {
    count: catalogResults.length,
    results: catalogResults,
  });
}

export function CelebrationQueueProvider({ children }: { children: ReactNode }) {
  const { isEnabled } = useGamificationEnabled();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const current = queue[0] ?? null;
  const checkInFlightRef = useRef(false);
  const hasSeededSnapshotRef = useRef(false);

  const enqueue = useCallback((events: CelebrationEvent[]) => {
    if (!events.length) return;
    setQueue((q) => [...q, ...events]);
  }, []);

  const syncSnapshot = useCallback(async () => {
    if (!isEnabled || checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    try {
      const [summary, catalog] = await Promise.all([
        gamificationApi.getMySummary(),
        gamificationApi.getBadgeCatalog(),
      ]);
      saveGamificationSnapshot(summary, catalog.results);
      syncQueryCaches(
        queryClient,
        summary,
        catalog.results,
        catalog.results.filter((b) => b.is_earned),
      );
      hasSeededSnapshotRef.current = true;
    } catch {
      /* ignore — gamification optional */
    } finally {
      checkInFlightRef.current = false;
    }
  }, [isEnabled, queryClient]);

  const checkForCelebrations = useCallback(async () => {
    if (!isEnabled || checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    try {
      const previous = loadGamificationSnapshot();
      const [summary, catalog] = await Promise.all([
        gamificationApi.getMySummary(),
        gamificationApi.getBadgeCatalog(),
      ]);
      const earnedBadges = catalog.results.filter((b) => b.is_earned);
      const { events, newCelebrated } = detectCelebrations(
        previous,
        summary,
        catalog.results,
      );
      const mergedCelebrated = [
        ...(previous?.celebrated_streak_milestones ?? []),
        ...newCelebrated,
      ];
      saveGamificationSnapshot(summary, catalog.results, mergedCelebrated);
      syncQueryCaches(queryClient, summary, catalog.results, earnedBadges);
      hasSeededSnapshotRef.current = true;

      if (events.length) {
        setQueue((q) => [...q, ...events]);
      }
    } catch {
      /* silent — awards are non-blocking UX */
    } finally {
      checkInFlightRef.current = false;
    }
  }, [isEnabled, queryClient]);

  // Seed snapshot once per session when gamification becomes active (no modals).
  useEffect(() => {
    if (!isEnabled || hasSeededSnapshotRef.current || loadGamificationSnapshot()) {
      if (loadGamificationSnapshot()) hasSeededSnapshotRef.current = true;
      return;
    }
    void syncSnapshot();
  }, [isEnabled, syncSnapshot]);

  const dismissCurrent = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const value = useMemo(
    () => ({ enqueue, checkForCelebrations, syncSnapshot }),
    [enqueue, checkForCelebrations, syncSnapshot],
  );

  return (
    <CelebrationQueueContext.Provider value={value}>
      {children}
      {current ? <CelebrationModal event={current} onDismiss={dismissCurrent} /> : null}
    </CelebrationQueueContext.Provider>
  );
}

export function useCelebrationQueue(): CelebrationQueueContextValue {
  const ctx = useContext(CelebrationQueueContext);
  if (!ctx) {
    throw new Error('useCelebrationQueue must be used within CelebrationQueueProvider');
  }
  return ctx;
}

/** Safe when provider may be absent (tests). */
export function useCelebrationQueueOptional() {
  return useContext(CelebrationQueueContext);
}
