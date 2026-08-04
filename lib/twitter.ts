import { VideoItem } from "./types";
import { categoryForTag, Category } from "./categories";

// Same mechanism as FootAgent: read X through its public syndication CDN
// (the endpoint the embed widgets use) instead of the paid v2 API. No key,
// no bearer, no credits — sidesteps the "credits depleted" 402 entirely.
//
//   https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}
//
// It only serves *profile* timelines, not hashtag search — so, exactly like
// FootAgent, we synthesize a hashtag feed by sweeping a set of high-signal
// French handles and keeping the posts that mention the tag.

type SynMediaVariant = { content_type?: string; url?: string; bitrate?: number };
type SynMedia = {
  type?: string; // "photo" | "video" | "animated_gif"
  media_url_https?: string;
  video_info?: { variants?: SynMediaVariant[] };
};
type SynTweet = {
  id_str?: string;
  created_at?: string;
  full_text?: string;
  text?: string;
  permalink?: string;
  user?: { screen_name?: string; profile_image_url_https?: string };
  retweeted_status?: SynTweet;
  quoted_tweet?: SynTweet;
  mediaDetails?: SynMedia[];
  extended_entities?: { media?: SynMedia[] };
};
type SynEntry = { type: string; content?: { tweet?: SynTweet } };

type ParsedTweet = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  url: string;
  photo: string | null;
  poster: string | null;
  mp4: string | null;
};

// French handles per desk, ordered best-first — verified against the
// syndication CDN, media-rich timelines lead, dead/empty accounts (Konbini,
// Korben) dropped. Baseline is swept for every tag, so it stays to the two
// busiest accounts, which also warms the cache fastest.
const BASELINE: string[] = ["franceinfo", "BFMTV"];

const HANDLES_BY_CATEGORY: Record<Category, string[]> = {
  politique: ["LCP", "publicsenat"],
  economie: ["latribune", "BFMbusiness", "LesEchos"],
  international: ["RFI", "France24", "Courrier_Inter"],
  societe: ["20Minutes", "ouestfrance"],
  culture: ["lesinrocks", "Telerama", "brutofficiel", "AlloCine"],
  tech: ["01net", "Clubic", "Numerama"],
  sciences: ["Sciences_Avenir", "futurasciences"],
  environnement: ["Reporterre", "vertlemedia"],
  sport: ["lequipe", "RMCsport"],
};

// Topical handles are on-theme by construction, so we keep their whole recent
// timeline; baseline handles are generic, so we only keep posts that literally
// mention the tag. Same split as the news sources: a desk feed needs no keyword
// filter, a homepage feed does.
function handlesFor(tag: string): { topical: string[]; baseline: string[] } {
  const category = categoryForTag(tag);
  const topical = category ? HANDLES_BY_CATEGORY[category] : [];
  const topicalSet = new Set(topical.map((h) => h.toLowerCase()));
  const baseline = BASELINE.filter((h) => !topicalSet.has(h.toLowerCase()));
  return { topical, baseline };
}

// ---- syndication fetch + parse -------------------------------------------

function pickMp4(variants: SynMediaVariant[] | undefined): string | null {
  if (!variants) return null;
  const mp4s = variants.filter((v) => v.content_type === "video/mp4" && v.url);
  if (!mp4s.length) return null;
  mp4s.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return mp4s[0].url ?? null;
}

function firstNonEmpty<T>(...lists: (T[] | undefined)[]): T[] {
  for (const l of lists) if (l && l.length) return l;
  return [];
}

function mediaOf(t: SynTweet): { photo: string | null; poster: string | null; mp4: string | null } {
  const raw = firstNonEmpty(
    t.mediaDetails,
    t.extended_entities?.media,
    t.retweeted_status?.mediaDetails,
    t.retweeted_status?.extended_entities?.media,
    t.quoted_tweet?.mediaDetails,
    t.quoted_tweet?.extended_entities?.media
  );
  for (const m of raw) {
    if (!m.media_url_https) continue;
    if (m.type === "video" || m.type === "animated_gif") {
      const mp4 = pickMp4(m.video_info?.variants);
      if (mp4) return { photo: null, poster: m.media_url_https, mp4 };
    } else {
      return { photo: m.media_url_https, poster: null, mp4: null };
    }
  }
  return { photo: null, poster: null, mp4: null };
}

function cleanText(t: string): string {
  const stripped = t.replace(/\s+https?:\/\/t\.co\/\S+$/g, "").trim();
  return stripped.length ? stripped : t.trim();
}

// Walk the RT/quote chain so retweets surface real content, not "RT @x:".
function textOf(t: SynTweet): string {
  const direct = (t.full_text ?? t.text ?? "").trim();
  if (direct && !/^RT @\w+:\s*$/.test(direct)) return cleanText(direct);
  if (t.retweeted_status) return cleanText(t.retweeted_status.full_text ?? t.retweeted_status.text ?? direct);
  if (t.quoted_tweet) return cleanText(t.quoted_tweet.full_text ?? t.quoted_tweet.text ?? direct);
  return direct;
}

function toIso(s: string | undefined): string {
  const d = s ? new Date(s) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REFERER = "https://platform.twitter.com/";

// The CDN blocks Node's built-in fetch at the TLS-fingerprint level (JA3):
// undici gets a 429 on every call while curl — identical headers — gets 200.
// So we try undici first, and on failure fall back to the system `curl` when
// it exists (local dev, the Docker VPS). On Vercel there's no curl binary, so
// the fallback simply no-ops and the deck goes without X.
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*", Referer: REFERER },
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      const body = await res.text();
      if (!body.startsWith("Rate limit")) return body;
    }
  } catch {
    /* fall through to curl */
  }
  return fetchHtmlViaCurl(url);
}

let curlAvailable: boolean | null = null;

async function fetchHtmlViaCurl(url: string): Promise<string | null> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);

  if (curlAvailable === false) return null;
  try {
    const { stdout } = await run(
      "curl",
      ["-s", "--max-time", "8", "-H", `User-Agent: ${UA}`, "-H", "Accept: text/html,*/*", "-H", `Referer: ${REFERER}`, url],
      { maxBuffer: 8 * 1024 * 1024, timeout: 9000 }
    );
    curlAvailable = true;
    return stdout.startsWith("Rate limit") ? null : stdout;
  } catch (e) {
    // ENOENT = no curl binary (e.g. Vercel) — remember and stop trying.
    if ((e as NodeJS.ErrnoException).code === "ENOENT") curlAvailable = false;
    return null;
  }
}

async function fetchTimeline(handle: string): Promise<ParsedTweet[]> {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}?showReplies=false`;
  const html = await fetchHtml(url);
  if (!html) return [];

  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/);
  if (!m) return [];
  let entries: SynEntry[] = [];
  try {
    const pp = JSON.parse(m[1])?.props?.pageProps;
    entries = pp?.timeline?.entries ?? pp?.timeline_v2?.entries ?? [];
  } catch {
    return [];
  }

  const out: ParsedTweet[] = [];
  for (const e of entries) {
    if (e.type !== "tweet" || !e.content?.tweet) continue;
    const t = e.content.tweet;
    const id = t.id_str;
    const text = textOf(t);
    const author = t.user?.screen_name ?? handle;
    if (!id || !text) continue;
    const { photo, poster, mp4 } = mediaOf(t);
    out.push({
      id,
      text,
      author,
      createdAt: toIso(t.created_at),
      url: t.permalink ? `https://x.com${t.permalink}` : `https://x.com/${author}/status/${id}`,
      photo,
      poster,
      mp4,
    });
  }
  return out;
}

// ---- in-memory cache ------------------------------------------------------
// Flip-Library has no Firestore wired in (see lib/store.ts), so the equivalent
// of FootAgent's Firestore cache is a per-instance Map. Because every tag
// sweeps the same baseline handles, warming one tag makes the next nearly free
// — and keeps us well under the CDN's rate limit.

// A warm timeline is reused for 15 min; a stale one is still served for hours
// when the CDN is 429ing, so the deck keeps showing posts instead of emptying
// the moment the rate limit trips (the tweets carry their own date in the UI).
const FRESH_MS = 15 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;
const timelineCache = new Map<string, { at: number; tweets: ParsedTweet[] }>();

// A feed load fans out many tags at once, and they share handles (every tag
// sweeps the baseline). Without this, six tags wanting "franceinfo" would fire
// six simultaneous CDN hits and trip the rate limit; instead they all await the
// one in-flight request. This is what makes X survive the parallel Shorts load.
const inFlight = new Map<string, Promise<ParsedTweet[]>>();

async function cachedTimeline(handle: string): Promise<ParsedTweet[]> {
  const key = handle.toLowerCase();
  const hit = timelineCache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < FRESH_MS) return hit.tweets;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const fresh = await fetchTimeline(handle);
    if (fresh.length) {
      timelineCache.set(key, { at: Date.now(), tweets: fresh });
      return fresh;
    }
    // Refresh failed (usually a 429): serve the stale copy rather than nothing.
    const prev = timelineCache.get(key);
    if (prev && Date.now() - prev.at < STALE_MS) return prev.tweets;
    return [];
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

// The CDN's per-IP rate limit is tight enough that a burst of live hits trips
// it, so a cold load makes only a couple, taking the best-ranked handles first.
// Warm handles are free, so coverage accumulates across loads and the long
// stale window (STALE_MS) keeps earlier ones on screen meanwhile.
const MAX_COLD_FETCHES = 2;

// One sequential pass over handles (parallel bursts trip the CDN's per-IP rate
// limit), sharing a single cold-fetch budget. `handles` is passed most-valuable
// first so the budget lands on the on-theme accounts.
async function sweep(handles: string[]): Promise<ParsedTweet[][]> {
  const out: ParsedTweet[][] = [];
  let cold = 0;
  for (const h of handles) {
    const cached = timelineCache.get(h.toLowerCase());
    const isWarm = cached && Date.now() - cached.at < FRESH_MS;
    if (!isWarm && cold >= MAX_COLD_FETCHES) {
      out.push(cached?.tweets ?? []);
      continue;
    }
    if (!isWarm) cold++;
    out.push(await cachedTimeline(h).catch(() => []));
  }
  return out;
}

// ---- public API (unchanged signature) ------------------------------------

export async function searchTwitterHashtag(tag: string): Promise<VideoItem[]> {
  const clean = tag.replace(/^#/, "").trim();
  if (!clean) return [];

  // Topical handles first so the cold-fetch budget lands on the on-theme
  // accounts before the generic baseline.
  const { topical, baseline } = handlesFor(clean);
  const lists = await sweep([...topical, ...baseline]);
  const topicalLists = lists.slice(0, topical.length);
  const baselineLists = lists.slice(topical.length);

  const needle = normalize(clean);
  const wordRe = new RegExp(`(?:^|[^a-z0-9_])${escapeRe(needle)}(?:[^a-z0-9_]|$)`, "i");
  const mentionsTag = (t: ParsedTweet) => {
    const hay = normalize(t.text);
    return hay.includes(`#${needle}`) || wordRe.test(hay);
  };

  const seen = new Set<string>();
  const matched: ParsedTweet[] = [];
  const add = (t: ParsedTweet) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    matched.push(t);
  };
  // Topical handles: keep recent posts as-is (curated on-theme). Prefer ones
  // carrying media so the card has something to show.
  for (const list of topicalLists) for (const t of list) if (t.mp4 || t.photo) add(t);
  // Baseline handles: only what literally mentions the tag.
  for (const list of baselineLists) for (const t of list) if (mentionsTag(t)) add(t);

  matched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return matched.slice(0, 12).map((t) => ({
    id: `x-${t.id}`,
    kind: "video",
    title: t.text.slice(0, 200),
    thumbnail: t.poster || t.photo,
    source: "twitter",
    embedUrl: t.url,
    channel: `@${t.author}`,
    tag: clean,
    ...(t.mp4 ? { mp4: t.mp4 } : {}),
  }));
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
