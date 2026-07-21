import { FeedItem, EnvironmentConfig } from "./types";

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
    const res = await fetch(url);
    if (!res.ok) return { items: [] };
    return await res.json();
  } catch {
    return { items: [] };
  }
}

// Pulls articles + video for every tag in the environment and interleaves
// them into one shuffled feed — mixing reading and watching in the same deck.
export async function loadFeed(config: EnvironmentConfig): Promise<FeedItem[]> {
  const tags = config.tags.length ? config.tags : ["actualités"];

  const results = await Promise.all(
    tags.flatMap((tag) => [
      fetchJson(`/api/articles/search?tag=${encodeURIComponent(tag)}`),
      fetchJson(`/api/wikipedia/search?tag=${encodeURIComponent(tag)}`),
      fetchJson(`/api/video/youtube?tag=${encodeURIComponent(tag)}`),
      fetchJson(`/api/video/twitch?tag=${encodeURIComponent(tag)}`),
    ])
  );

  const items: FeedItem[] = results.flatMap((r) => r.items || []);
  return shuffle(items);
}
