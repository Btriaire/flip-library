import { VideoItem } from "./types";

// YouTube returns titles HTML-escaped ("Aya Nakamura &amp; …"), and this runs
// server-side where there's no DOM to decode with.
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

// YouTube Data API v3 — needs YOUTUBE_API_KEY (free quota, no billing required
// for search.list at normal personal-use volume).
export async function searchYouTubeShorts(tag: string): Promise<VideoItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const url =
    "https://www.googleapis.com/youtube/v3/search?" +
    new URLSearchParams({
      part: "snippet",
      q: tag,
      type: "video",
      videoDuration: "short",
      maxResults: "12",
      key: apiKey,
    });

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`YouTube ${res.status}`);
  const data = await res.json();

  return (data.items || []).map((item: any) => {
    const videoId = item.id.videoId;
    return {
      id: `yt-${videoId}`,
      kind: "video",
      title: decodeEntities(item.snippet.title),
      thumbnail: item.snippet.thumbnails?.medium?.url || null,
      source: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`,
      channel: decodeEntities(item.snippet.channelTitle),
      tag,
    } satisfies VideoItem;
  });
}
