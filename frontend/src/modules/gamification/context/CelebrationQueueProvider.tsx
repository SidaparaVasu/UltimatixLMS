import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
import { useGamificationEnabled } from '../hooks/useGamificationEnabled';

interface CelebrationQueueContextValue {
  enqueue: (events: CelebrationEvent[]) => void;
  /** Refetch summary + catalog, diff vs session snapshot, queue new celebrations. */
  checkForCelebrations: () => Promise<void>;
  /** Seed snapshot without showing modals (e.g. after dashboard load). */
  syncSnapshot: () => Promise<void>;
}

const CelebrationQueueContext = createContext<CelebrationQueueContextValue | null>(null);

export function CelebrationQueueProvider({ children }: { children: ReactNode }) {
  const { isEnabled } = useGamificationEnabled();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const current = queue[0] ?? null;

  const enqueue = useCallback((events: CelebrationEvent[]) => {
    if (!events.length) return;
    setQueue((q) => [...q, ...events]);
  }, []);

  const syncSnapshot = useCallback(async () => {
    if (!isEnabled) return;
    try {
      const [summary, catalog] = await Promise.all([
        gamificationApi.getMySummary(),
        gamificationApi.getBadgeCatalog(),
      ]);
      saveGamificationSnapshot(summary, catalog.results);
    } catch {
      /* ignore — gamification optional */
    }
  }, [isEnabled]);

  const checkForCelebrations = useCallback(async () => {
    if (!isEnabled) return;
    try {
      const previous = loadGamificationSnapshot();
      const [summary, catalog] = await Promise.all([
        gamificationApi.getMySummary(),
        gamificationApi.getBadgeCatalog(),
      ]);
      const events = detectCelebrations(previous, summary, catalog.results);
      saveGamificationSnapshot(summary, catalog.results);
      if (events.length) {
        setQueue((q) => [...q, ...events]);
        void queryClient.invalidateQueries({ queryKey: ['gamification'] });
      }
    } catch {
      /* silent — awards are non-blocking UX */
    }
  }, [isEnabled]);

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
