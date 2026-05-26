/**
 * Renders YouTube/Vimeo embeds with heartbeat sync every 10s.
 * Auto-marks complete at 90%+ via postMessage API.
 * Resumes from last playhead position.
 *
 * Note: "Mark as Complete" button is in ContentRenderer's lesson header.
 * This component only handles auto-completion at 90% threshold.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { CourseLesson, CourseContent } from '@/types/courses.types';
import { DetailedEnrollmentProgress, LessonProgress } from '@/types/player.types';
import { useHeartbeat, useMarkLessonComplete } from '@/queries/learner/usePlayerQueries';
import { useCoursePlayerStore } from '@/stores/coursePlayerStore';
import { LessonNavFooter } from '@/components/learner/player/LessonNavFooter';

interface VideoPlayerProps {
  content: CourseContent;
  lesson: CourseLesson;
  enrollment: DetailedEnrollmentProgress;
  lessonProgress: LessonProgress | undefined;
  nextLesson: CourseLesson | null;
}

type VideoProvider = 'youtube' | 'vimeo' | 'unknown';

const detectProvider = (url: string): VideoProvider => {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  return 'unknown';
};

const buildEmbedUrl = (url: string, provider: VideoProvider, startSeconds = 0): string => {
  if (provider === 'youtube') {
    const match =
      url.match(/[?&]v=([^&]+)/) ||
      url.match(/youtu\.be\/([^?]+)/) ||
      url.match(/embed\/([^?]+)/);
    const videoId = match?.[1] ?? '';
    const params = new URLSearchParams({
      enablejsapi: '1',
      origin: window.location.origin,
      rel: '0',
      modestbranding: '1',
      autoplay: '1',
      mute: '1',
      playsinline: '1',
      start: String(startSeconds),
    });
    return `https://www.youtube.com/embed/${videoId}?${params}`;
  }
  if (provider === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    const videoId = match?.[1] ?? '';
    const params = new URLSearchParams({
      api: '1',
      player_id: 'vimeo-player',
      autoplay: '1',
      muted: '1',
      playsinline: '1',
    });
    return `https://player.vimeo.com/video/${videoId}?${params}#t=${startSeconds}s`;
  }
  return url;
};

export const VideoPlayer = ({
  content,
  lesson,
  enrollment,
  lessonProgress,
  nextLesson,
}: VideoPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playheadRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  const { showLessonCompleteOverlay } = useCoursePlayerStore();
  const heartbeatMutation = useHeartbeat();
  const markCompleteMutation = useMarkLessonComplete();

  const isAlreadyCompleted = lessonProgress?.status === 'COMPLETED';

  // Get resume position from content progress
  const resumeSeconds = useMemo(() => {
    const cp = lessonProgress?.content_progress.find((c) => c.content === content.id);
    return cp?.playhead_seconds ?? 0;
  }, [lessonProgress, content.id]);

  const provider = detectProvider(content.content_url);
  const embedUrl = buildEmbedUrl(content.content_url, provider, resumeSeconds);

  const sendHeartbeat = useCallback(() => {
    if (playheadRef.current <= 0) return;
    heartbeatMutation.mutate({
      enrollment_id: enrollment.id,
      lesson_id: lesson.id,
      content_id: content.id,
      playhead_seconds: playheadRef.current,
      signal_completion: false,
    });
  }, [enrollment.id, lesson.id, content.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAutoComplete = useCallback(() => {
    if (completedRef.current || isAlreadyCompleted) return;
    completedRef.current = true;
    markCompleteMutation.mutate(
      { enrollmentId: enrollment.id, lessonId: lesson.id, contentId: content.id },
      { onSuccess: () => showLessonCompleteOverlay(lesson.id) }
    );
  }, [isAlreadyCompleted, enrollment.id, lesson.id, content.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // YouTube postMessage listener for playhead tracking
  useEffect(() => {
    if (provider !== 'youtube') return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            playheadRef.current = Math.floor(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number') {
            durationRef.current = data.info.duration;
          }
          // Auto-complete at 90%
          if (
            !completedRef.current &&
            !isAlreadyCompleted &&
            durationRef.current > 0 &&
            playheadRef.current / durationRef.current >= 0.9
          ) {
            handleAutoComplete();
          }
        }
      } catch {
        // Non-JSON messages — ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [provider, isAlreadyCompleted, handleAutoComplete]);

  // Heartbeat every 10s
  useEffect(() => {
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10_000);
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      sendHeartbeat(); // final heartbeat on unmount
    };
  }, [sendHeartbeat]);

  // Poll YouTube for current time every second
  useEffect(() => {
    if (provider !== 'youtube') return;
    const interval = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening' }),
        '*'
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [provider]);

  // Unknown provider — show link fallback
  if (provider === 'unknown') {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-2">Video content</p>
          <a
            href={content.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {content.content_url}
          </a>
        </div>
        <LessonNavFooter
          lesson={lesson}
          nextLesson={nextLesson}
          isCompleted={isAlreadyCompleted ?? false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* 16:9 video embed */}
      <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={lesson.lesson_title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Auto-complete hint */}
      {/** Hide auto-complete hint from user */}
      {/* {!isAlreadyCompleted && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-400">
            Video will auto-complete when you reach 90% progress
          </p>
        </div>
      )} */}

      <LessonNavFooter
        lesson={lesson}
        nextLesson={nextLesson}
        isCompleted={isAlreadyCompleted ?? false}
      />
    </div>
  );
};
