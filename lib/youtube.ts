import { VideoItem } from "./types";

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

  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube ${res.status}`);
  const data = await res.json();

  return (data.items || []).map((item: any) => {
    const videoId = item.id.videoId;
    return {
      id: `yt-${videoId}`,
      kind: "video",
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || null,
      source: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`,
      channel: item.snippet.channelTitle,
      tag,
    } satisfies VideoItem;
  });
}
