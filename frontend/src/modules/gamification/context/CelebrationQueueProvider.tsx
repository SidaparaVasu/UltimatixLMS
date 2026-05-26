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
  applyServerSnapshot,
  mapApiCelebrationEvent,
  readSessionSnapshotForAck,
} from '../celebration/mapApiCelebration';
import {
  detectCelebrations,
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
  checkForCelebrations: () => Promise<void>;
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
  const { isEnabled, isLoading: gamificationLoading } = useGamificationEnabled();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const current = queue[0] ?? null;
  const checkInFlightRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const needsServerAckRef = useRef(false);

  const flushServerAck = useCallback(async () => {
    const snapshot = readSessionSnapshotForAck();
    if (!snapshot) return;
    try {
      const ack = await gamificationApi.acknowledgeCelebrations(snapshot);
      if (ack.snapshot) {
        applyServerSnapshot(ack.snapshot);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  const enqueue = useCallback((events: CelebrationEvent[]) => {
    if (!events.length) return;
    needsServerAckRef.current = true;
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
      await flushServerAck();
    } catch {
      /* ignore */
    } finally {
      checkInFlightRef.current = false;
    }
  }, [isEnabled, queryClient, flushServerAck]);

  const checkForCelebrations = useCallback(async () => {
    if (!isEnabled || checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    try {
      const pending = await gamificationApi.getPendingCelebrations();

      if (pending.needs_baseline) {
        const ack = await gamificationApi.acknowledgeCelebrations();
        if (ack.snapshot) {
          applyServerSnapshot(ack.snapshot);
        }
        return;
      }

      const [summary, catalog] = await Promise.all([
        gamificationApi.getMySummary(),
        gamificationApi.getBadgeCatalog(),
      ]);
      const earnedBadges = catalog.results.filter((b) => b.is_earned);
      syncQueryCaches(queryClient, summary, catalog.results, earnedBadges);

      if (pending.snapshot) {
        applyServerSnapshot(pending.snapshot);
      }

      if (pending.events?.length) {
        const [summary, catalog] = await Promise.all([
          gamificationApi.getMySummary(),
          gamificationApi.getBadgeCatalog(),
        ]);
        syncQueryCaches(
          queryClient,
          summary,
          catalog.results,
          catalog.results.filter((b) => b.is_earned),
        );
        enqueue(pending.events.map(mapApiCelebrationEvent));
        return;
      }

      const { events, newCelebrated } = detectCelebrations(
        pending.snapshot
          ? {
              lifetime_xp: pending.snapshot.lifetime_xp,
              badge_codes: pending.snapshot.badge_codes,
              streaks: pending.snapshot.streaks,
              celebrated_streak_milestones: pending.snapshot.celebrated_streak_milestones,
            }
          : null,
        summary,
        catalog.results,
      );

      const mergedCelebrated = [
        ...(pending.snapshot?.celebrated_streak_milestones ?? []),
        ...newCelebrated,
      ];
      saveGamificationSnapshot(summary, catalog.results, mergedCelebrated);

      if (events.length) {
        enqueue(events);
      } else {
        await flushServerAck();
      }
    } catch {
      /* silent */
    } finally {
      checkInFlightRef.current = false;
    }
  }, [isEnabled, queryClient, enqueue, flushServerAck]);

  const loadPendingOnLogin = useCallback(async () => {
    if (!isEnabled || checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    try {
      const pending = await gamificationApi.getPendingCelebrations();

      if (pending.needs_baseline) {
        const ack = await gamificationApi.acknowledgeCelebrations();
        if (ack.snapshot) {
          applyServerSnapshot(ack.snapshot);
        }
        return;
      }

      if (pending.snapshot) {
        applyServerSnapshot(pending.snapshot);
      }

      if (pending.events?.length) {
        enqueue(pending.events.map(mapApiCelebrationEvent));
      }
    } catch {
      /* migration missing or gamification API down — do not block app */
    } finally {
      checkInFlightRef.current = false;
    }
  }, [isEnabled, enqueue]);

  useEffect(() => {
    if (gamificationLoading || !isEnabled || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    void loadPendingOnLogin();
  }, [gamificationLoading, isEnabled, loadPendingOnLogin]);

  useEffect(() => {
    if (queue.length > 0 || !needsServerAckRef.current) return;
    needsServerAckRef.current = false;
    void flushServerAck();
  }, [queue.length, flushServerAck]);

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

export function useCelebrationQueueOptional() {
  return useContext(CelebrationQueueContext);
}
