import { FeedItem } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchJson(url: string): Promise<{ items: any[] }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { items: [] };
    return await res.json();
  } catch {
    return { items: [] };
  }
}

// Load YouTube Shorts, Twitch, and X/Twitter for dedicated short content feed
export async function loadShorts(): Promise<FeedItem[]> {
  const tags = ["musique", "voyage", "cinéma", "humour", "sport", "tech"];

  const results = await Promise.all(
    tags.flatMap((tag) => [
      fetchJson(`/api/video/youtube?tag=${encodeURIComponent(tag)}`),
      fetchJson(`/api/video/twitch?tag=${encodeURIComponent(tag)}`),
      fetchJson(`/api/twitter/search?tag=${encodeURIComponent(tag)}`),
    ])
  );

  const items: FeedItem[] = results.flatMap((r) => r.items || []);
  return shuffle(items);
}
