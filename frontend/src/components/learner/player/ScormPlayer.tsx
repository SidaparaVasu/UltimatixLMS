/**
 *
 * Renders a SCORM package inside a sandboxed iframe.
 *
 * Responsibilities:
 *  - Fetches saved SCORM state on mount and seeds scorm-again with it (enables resume)
 *  - Exposes window.API (SCORM 1.2) or window.API_1484_11 (SCORM 2004) on the parent frame
 *  - Wires CommitSuccess and Terminate hooks → POSTs commit payload to backend
 *  - On completion: invalidates TanStack Query enrollment cache + shows LessonCompleteOverlay
 *  - Cleans up window.API on unmount to prevent stale references between lessons
 *  - sendBeacon on tab close for best-effort final commit
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Scorm12API, Scorm2004API } from 'scorm-again';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';

import { CourseLesson, CourseContent } from '@/types/courses.types';
import { DetailedEnrollmentProgress, LessonProgress } from '@/types/player.types';
import { ScormPackageMeta } from '@/types/scorm.types';
import { scormApi } from '@/api/scorm-api';
import { PLAYER_QUERY_KEYS } from '@/queries/learner/usePlayerQueries';
import { useCoursePlayerStore } from '@/stores/coursePlayerStore';
import { LessonNavFooter } from '@/components/learner/player/LessonNavFooter';

interface ScormPlayerProps {
  content: CourseContent;
  lesson: CourseLesson;
  enrollment: DetailedEnrollmentProgress;
  lessonProgress: LessonProgress | undefined;
  nextLesson: CourseLesson | null;
  scormMeta: ScormPackageMeta;
}

type LoadState = 'loading' | 'ready' | 'error';

export const ScormPlayer = ({
  content,
  lesson,
  enrollment,
  lessonProgress,
  nextLesson,
  scormMeta,
}: ScormPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const apiRef    = useRef<Scorm12API | Scorm2004API | null>(null);
  const sessionStartRef   = useRef(Date.now());
  const isCompletedRef    = useRef(false);
  const lastCommitTimeRef = useRef(0);
  const commitPayloadRef  = useRef<Record<string, string>>({});  // for sendBeacon

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const queryClient = useQueryClient();
  const { showLessonCompleteOverlay } = useCoursePlayerStore();

  const isAlreadyCompleted = lessonProgress?.status === 'COMPLETED';

  // The iframe loads the launch URL that the backend built (same-origin in dev via Vite proxy)
  const iframeSrc = scormMeta.content_url ?? '';

  /**
   * Called on every CommitSuccess and Terminate event from scorm-again.
   * Debounced to 2s to avoid hammering the backend on rapid SetValue calls.
   */
  const handleCommit = useCallback(
    async (commitObject?: Record<string, string>, isFinal: boolean = false) => {
      // Robust lookup: fallback to getCommitObject() from active API if commitObject is undefined
      const data = commitObject || (apiRef.current as any)?.getCommitObject() || {};

      const completionStatuses = ['completed', 'passed'];
      const reportedStatus =
        data['cmi.core.lesson_status'] ||
        data['cmi.completion_status'] ||
        '';

      const hasCompletion = completionStatuses.includes(reportedStatus);

      // Debounce regular commits, but never debounce final termination or completion status changes
      const now = Date.now();
      if (!isFinal && !hasCompletion && now - lastCommitTimeRef.current < 2000) return;
      if (!isFinal && !hasCompletion) {
        lastCommitTimeRef.current = now;
      }

      // Grace period: ignore completion signals fired within the first 2s of the session.
      // Guards against buggy packages that call LMSSetValue("completed") on initial loading thread.
      const SESSION_GRACE_MS = 2000;

      if (
        hasCompletion &&
        Date.now() - sessionStartRef.current < SESSION_GRACE_MS
      ) {
        // Strip the premature completion — still commit other state
        delete data['cmi.core.lesson_status'];
        delete data['cmi.completion_status'];
      }

      // Keep a reference for the sendBeacon fallback on tab close
      commitPayloadRef.current = data;

      const result = await scormApi.commit({
        enrollment_id: enrollment.id,
        content_id:    content.id,
        lesson_id:     lesson.id,
        scorm_data:    data,
      });

      if (!result) return;

      // If completion is now recorded, update UI
      if (
        !isCompletedRef.current &&
        !isAlreadyCompleted &&
        completionStatuses.includes(result.lesson_status)
      ) {
        isCompletedRef.current = true;
        queryClient.invalidateQueries({
          queryKey: PLAYER_QUERY_KEYS.enrollmentProgress(enrollment.id),
        });
        queryClient.invalidateQueries({ queryKey: ['learner', 'my-enrollments'] });
        showLessonCompleteOverlay(lesson.id);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrollment.id, content.id, lesson.id, isAlreadyCompleted]
  );

  /**
   * Mount scorm-again API on window, seed it with saved state, then show iframe.
   * API is mounted BEFORE the iframe loads so the content's LMSInitialize() finds it.
   */
  useEffect(() => {
    sessionStartRef.current = Date.now();
    isCompletedRef.current  = false;
    lastCommitTimeRef.current = 0;

    let mounted = true;

    const initialize = async () => {
      setLoadState('loading');
      setErrorMessage('');

      // 1. Load saved state from backend
      const savedState = await scormApi.loadState(enrollment.id, content.id);
      if (!mounted) return;

      // 2. Build initial data for scorm-again
      const initialData = buildInitialData(scormMeta.scorm_version, savedState);

      // 3. scorm-again settings
      const settings = {
        autocommit:        true,
        autocommitSeconds: 30,      // fire Commit every 30s even if the package forgets
        lmsCommitUrl:      '',      // we handle commit via onCommitCallback, not direct POST
        logLevel:          2,       // 1=error, 2=warn, 3=info, 4=debug
      };

      // 4. Create API instance matching SCORM version
      let api: Scorm12API | Scorm2004API;

      if (scormMeta.scorm_version === '1.2') {
        api = new Scorm12API({ ...settings, dataCommitFormat: 'json', initialData });
        (window as any).API = api;
      } else {
        api = new Scorm2004API({ ...settings, dataCommitFormat: 'json', initialData });
        (window as any).API_1484_11 = api;
      }
      apiRef.current = api;

      // Override internal HTTP requests to completely prevent scorm-again from making direct AJAX calls
      (api as any).processHttpRequest = function () {
        return Promise.resolve({ success: true });
      };

      // 5. Wire commit hooks
      // scorm-again fires 'CommitSuccess' after each successful internal Commit()
      (api as any).on('CommitSuccess', (commitObj: Record<string, string>) => {
        handleCommit(commitObj, false);
      });
      // Also fire on Terminate (LMSFinish) for a final commit
      (api as any).on('Terminate', (commitObj: Record<string, string>) => {
        handleCommit(commitObj, true);
      });

      // 6. Mount on window.top too for packages that search up the frame chain
      try {
        if (window.top && window.top !== window) {
          if (scormMeta.scorm_version === '1.2') {
            (window.top as any).API = api;
          } else {
            (window.top as any).API_1484_11 = api;
          }
        }
      } catch {
        // window.top is cross-origin — skip silently
      }

      if (mounted) setLoadState('ready');
    };

    initialize().catch((err) => {
      console.error('[ScormPlayer] Initialization failed:', err);
      if (mounted) {
        setErrorMessage('Failed to initialize SCORM session. Please refresh the page.');
        setLoadState('error');
      }
    });

    // Cleanup: remove API from window when component unmounts (e.g. switching lessons)
    return () => {
      mounted = false;

      if ((window as any).API === apiRef.current)          delete (window as any).API;
      if ((window as any).API_1484_11 === apiRef.current)  delete (window as any).API_1484_11;
      try {
        if (window.top && window.top !== window) {
          if ((window.top as any).API === apiRef.current)          delete (window.top as any).API;
          if ((window.top as any).API_1484_11 === apiRef.current)  delete (window.top as any).API_1484_11;
        }
      } catch { /* cross-origin — skip */ }

      apiRef.current = null;
    };
  }, [content.id, enrollment.id, scormMeta.scorm_version]); // eslint-disable-line react-hooks/exhaustive-deps

  // sendBeacon on tab close — best-effort final commit
  // sendBeacon is the only method that reliably fires when the user closes the tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!commitPayloadRef.current || Object.keys(commitPayloadRef.current).length === 0) return;

      const payload = JSON.stringify({
        enrollment_id: enrollment.id,
        content_id:    content.id,
        lesson_id:     lesson.id,
        scorm_data:    commitPayloadRef.current,
      });
      navigator.sendBeacon('/api/v1/learning/scorm/commit/', new Blob([payload], { type: 'application/json' }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enrollment.id, content.id, lesson.id]);

  // --- Render ---

  if (!iframeSrc) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          <AlertCircle className="shrink-0 h-5 w-5" />
          <div>
            <p className="font-medium">SCORM package not ready</p>
            <p className="text-xs mt-1 text-amber-600">
              The package may still be extracting. Refresh the page in a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="shrink-0 h-5 w-5" />
          <div>
            <p className="font-medium">Failed to load SCORM content</p>
            <p className="text-xs mt-1 text-red-500">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === 'loading') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
          <Loader2 className="animate-spin h-5 w-5" />
          <span className="text-sm">Loading SCORM content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative bg-white">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={lesson.lesson_title}
          className="w-full h-full border-0"
          style={{ minHeight: '600px' }}
          /**
           * Sandbox attributes:
           *  - allow-scripts:      Required — SCORM content is JavaScript-driven
           *  - allow-same-origin:  Required — needed for window.parent.API access (SCORM spec)
           *  - allow-forms:        Some packages have form elements
           *  - allow-popups:       Some older packages open new windows for navigation
           *  - allow-downloads:    Resource files / certificates within the package
           *  - allow-modals:       Required — allows alert() / confirm() from the iframe content
           *
           * Intentionally NOT included:
           *  - allow-top-navigation:  Would allow the package to redirect the browser (phishing risk)
           */
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
          referrerPolicy="no-referrer"
          loading="eager"
          onLoad={() => {
            try {
              const win = iframeRef.current?.contentWindow;
              if (win) {
                // Intercept alert and log them to console instead
                win.alert = (msg) => {
                  console.warn('[SCORM Alert Suppressed]:', msg);
                };
                // Intercept confirm and auto-resolve to true (e.g. for resume prompts)
                win.confirm = (msg) => {
                  console.warn('[SCORM Confirm Suppressed]:', msg);
                  return true;
                };
              }
            } catch (err) {
              console.error('Failed to intercept iframe alert/confirm:', err);
            }
          }}
        />
      </div>

      <LessonNavFooter
        lesson={lesson}
        nextLesson={nextLesson}
        isCompleted={isAlreadyCompleted || isCompletedRef.current}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts saved backend state into scorm-again's expected initialData format.
 * This is what makes resume work — the course reads these values on LMSGetValue().
 */
function buildInitialData(
  version: string,
  saved: import('@/types/scorm.types').ScormSavedState | null
): Record<string, string> {
  if (version === '1.2') {
    if (!saved) return {};
    const d: Record<string, string> = {};
    if (saved.lesson_status)   d['cmi.core.lesson_status']   = saved.lesson_status;
    if (saved.lesson_location) d['cmi.core.lesson_location'] = saved.lesson_location;
    if (saved.suspend_data)    d['cmi.suspend_data']          = saved.suspend_data;
    if (saved.score_raw  != null) d['cmi.core.score.raw']   = saved.score_raw;
    if (saved.score_max  != null) d['cmi.core.score.max']   = saved.score_max;
    if (saved.score_min  != null) d['cmi.core.score.min']   = saved.score_min;
    return d;
  }

  // SCORM 2004
  const d: Record<string, string> = {};

  if (saved) {
    if (saved.lesson_status)   d['cmi.completion_status'] = saved.lesson_status;
    if (saved.lesson_location) d['cmi.location']          = saved.lesson_location;
    if (saved.suspend_data)    d['cmi.suspend_data']       = saved.suspend_data;
    if (saved.score_raw  != null) d['cmi.score.raw']      = saved.score_raw;
    if (saved.score_max  != null) d['cmi.score.max']      = saved.score_max;
    if (saved.score_min  != null) d['cmi.score.min']      = saved.score_min;

    // Restore all previously committed SCORM variables (includes scores, dynamic objectives, etc.)
    if (saved.scorm_variables) {
      Object.assign(d, saved.scorm_variables);
    }
  }

  // Pre-seed standard ADL sequencing objectives only if they are not already populated in the saved state
  // This prevents previous empty attempts in the database from overwriting our objectives.
  if (!d['cmi.objectives._count'] || d['cmi.objectives._count'] === '0') {
    d['cmi.objectives._count'] = '4';
    d['cmi.objectives.0.id'] = 'obj_playing';
    d['cmi.objectives.1.id'] = 'obj_etiquette';
    d['cmi.objectives.2.id'] = 'obj_handicapping';
    d['cmi.objectives.3.id'] = 'obj_havingfun';
  }

  return d;
}
