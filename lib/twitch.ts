import { VideoItem } from "./types";

// Twitch Helix API — needs TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET.
// App-access token is cached in memory between calls (serverless: best-effort,
// re-fetched on cold start).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Twitch auth ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

export async function searchTwitchClips(tag: string): Promise<VideoItem[]> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const token = await getAppToken(clientId, clientSecret);
  const headers = { "Client-Id": clientId, Authorization: `Bearer ${token}` };

  // Twitch clips search is done by game/category, not free text — resolve the
  // tag to a category first, then pull top clips for it.
  const gameRes = await fetch(
    `https://api.twitch.tv/helix/games?` + new URLSearchParams({ name: tag }),
    { headers }
  );
  if (!gameRes.ok) throw new Error(`Twitch games ${gameRes.status}`);
  const gameData = await gameRes.json();
  const gameId = gameData.data?.[0]?.id;
  if (!gameId) return [];

  const clipsRes = await fetch(
    `https://api.twitch.tv/helix/clips?` + new URLSearchParams({ game_id: gameId, first: "12" }),
    { headers }
  );
  if (!clipsRes.ok) throw new Error(`Twitch clips ${clipsRes.status}`);
  const clipsData = await clipsRes.json();

  const parentDomain = process.env.NEXT_PUBLIC_SITE_HOST || "localhost";
  return (clipsData.data || []).map((clip: any) => ({
    id: `tw-${clip.id}`,
    kind: "video",
    title: clip.title,
    thumbnail: clip.thumbnail_url,
    source: "twitch",
    embedUrl: `https://clips.twitch.tv/embed?clip=${clip.id}&parent=${parentDomain}&autoplay=true&muted=true`,
    channel: clip.broadcaster_name,
    tag,
  } satisfies VideoItem));
}
