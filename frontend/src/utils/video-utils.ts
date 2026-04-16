/**
 * Video Utilities for parsing and fetching metadata from common video providers.
 */

export interface VideoInfo {
  type: 'youtube' | 'vimeo';
  id: string;
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
 * Fetches the video title using public oEmbed APIs.
 * This is generally CORS-friendly for YouTube and Vimeo.
 */
export const fetchVideoTitle = async (url: string): Promise<string | null> => {
  const info = getVideoInfo(url);
  if (!info) return null;

  try {
    let oEmbedUrl = '';
    if (info.type === 'youtube') {
      oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (info.type === 'vimeo') {
      oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    }

    if (!oEmbedUrl) return null;

    const response = await fetch(oEmbedUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.title || null;
  } catch (err) {
    console.error("Error fetching video metadata:", err);
    return null;
  }
};
