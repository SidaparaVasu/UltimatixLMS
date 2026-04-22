import React from 'react';
import { Video, AlertCircle, ExternalLink } from 'lucide-react';
import { getVideoInfo } from '@/utils/video-utils';

interface VideoViewerProps {
  videoUrl?: string;
  title?: string;
}

/**
 * VideoViewer — Learner-facing video content renderer.
 * Reuses getVideoInfo() from video-utils.ts for zero-duplication URL parsing.
 * Renders an embedded iframe for YouTube/Vimeo, or an elegant empty/error state.
 * Designed to be reused in the actual Learner page when APIs are integrated.
 */
export const VideoViewer: React.FC<VideoViewerProps> = ({ videoUrl, title }) => {
  const videoInfo = getVideoInfo(videoUrl || '');

  // ── Empty State: No URL provided ──────────────────────────────────
  if (!videoUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900/50 border border-dashed border-slate-700 text-slate-500 gap-3">
        <Video size={36} className="opacity-30" />
        <p className="text-sm font-medium">No video content added to this lesson.</p>
      </div>
    );
  }

  // ── Error State: URL provided but unrecognised ──────────────────────
  if (!videoInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-950/20 border border-dashed border-red-500/30 text-red-400 gap-3">
        <AlertCircle size={36} className="opacity-50" />
        <p className="text-sm font-medium">Unsupported video URL</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors underline"
        >
          <ExternalLink size={12} /> Open link directly
        </a>
      </div>
    );
  }

  // ── Success State: Embedded Player ──────────────────────────────────
  const iframeSrc =
    videoInfo.type === 'youtube'
      ? `https://www.youtube.com/embed/${videoInfo.id}?rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${videoInfo.id}?title=0&byline=0&portrait=0`;

  const iframeAllow =
    videoInfo.type === 'youtube'
      ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      : 'autoplay; fullscreen; picture-in-picture';

  return (
    <div className="space-y-3">
      {/* Aspect-ratio locked player shell */}
      <div className="relative w-full aspect-video overflow-hidden bg-black">
        <iframe
          src={iframeSrc}
          title={title || 'Video Lesson'}
          allow={iframeAllow}
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
};
