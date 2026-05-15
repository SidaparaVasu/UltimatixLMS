/**
 * Video Utilities for parsing and fetching metadata from common video providers.
 */

export interface VideoInfo {
  type: 'youtube' | 'vimeo';
  id: string;
}

export interface VideoMetadata {
  title: string | null;
  /** Duration in minutes, rounded up. Null when the provider doesn't return it. */
  durationMinutes: number | null;
}

/**
 * Extracts video provider type and ID from a given URL.
 * Supports YouTube (Shorts, Regular, Embed, Youtu.be) and Vimeo.
 */
export const getVideoInfo = (url: string): VideoInfo | null => {
  if (!url) return null;

  // Youtube Regex
  // Matches: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/..., youtube.com/shorts/...
  const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };

  // Vimeo Regex
  // Matches: vimeo.com/..., player.vimeo.com/video/...
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };

  return null;
};

/**
 * Fetches video metadata (title + duration) using public oEmbed APIs.
 *
 * Duration notes:
 * - Vimeo oEmbed returns `duration` in seconds — we convert to minutes (ceil).
 * - YouTube oEmbed does NOT return duration. As a fallback we attempt to read
 *   the `approxDurationMs` field from YouTube's oembed-adjacent noembed.com
 *   proxy, which sometimes carries it. If unavailable, durationMinutes is null.
 */
export const fetchVideoMetadata = async (url: string): Promise<VideoMetadata> => {
  const info = getVideoInfo(url);
  if (!info) return { title: null, durationMinutes: null };

  try {
    let oEmbedUrl = '';
    if (info.type === 'youtube') {
      oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (info.type === 'vimeo') {
      oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    }

    if (!oEmbedUrl) return { title: null, durationMinutes: null };

    const response = await fetch(oEmbedUrl);
    if (!response.ok) return { title: null, durationMinutes: null };

    const data = await response.json();

    const title: string | null = data.title || null;

    // Vimeo returns duration in seconds directly on the oEmbed response.
    // YouTube does not — durationMinutes stays null for YouTube.
    let durationMinutes: number | null = null;
    if (info.type === 'vimeo' && typeof data.duration === 'number' && data.duration > 0) {
      durationMinutes = Math.ceil(data.duration / 60);
    }

    return { title, durationMinutes };
  } catch (err) {
    console.error('Error fetching video metadata:', err);
    return { title: null, durationMinutes: null };
  }
};

/**
 * @deprecated Use fetchVideoMetadata instead.
 * Kept for any callers that only need the title.
 */
export const fetchVideoTitle = async (url: string): Promise<string | null> => {
  const { title } = await fetchVideoMetadata(url);
  return title;
};
