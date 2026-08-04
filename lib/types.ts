// Tag-driven universes, editable in /settings. Named after what they cover,
// not after who they're for — "perso/pro/other" said nothing about content.
export type EnvironmentKey = "monde" | "tech" | "culture";

export const ENVIRONMENTS: { key: EnvironmentKey; label: string }[] = [
  { key: "monde", label: "Monde" },
  { key: "tech", label: "Tech" },
  { key: "culture", label: "Culture" },
];

// Feeds with their own loader rather than a tag list.
export type SpecialFeedKey = "presse" | "shorts";

export type FeedKey = SpecialFeedKey | EnvironmentKey;

export type FeedIconName = "news" | "shorts" | "globe" | "chip" | "palette";

// Source of truth for the top navigation bar, in display order.
export const FEEDS: { key: FeedKey; label: string; icon: FeedIconName }[] = [
  { key: "presse", label: "À la une", icon: "news" },
  { key: "shorts", label: "Shorts", icon: "shorts" },
  { key: "monde", label: "Monde", icon: "globe" },
  { key: "tech", label: "Tech", icon: "chip" },
  { key: "culture", label: "Culture", icon: "palette" },
];

export type ArticleItem = {
  id: string;
  kind: "article";
  title: string;
  excerpt: string;
  image: string | null;
  source: string;
  url: string;
  publishedAt: string | null;
  tag: string;
  // Set for sources with an explicit open license for full content (The
  // Conversation France, CC BY-ND — never scraped from a publisher's page),
  // OR for NEWPI (source: "NEWPI") — a transformative AI reformulation across
  // several press sources, not a verbatim reproduction, always shipped with
  // `sources` below and clearly labelled via `license`. Absent for regular
  // news items, which link out instead and get `digest` at read time.
  fullText?: string;
  fullTextIsHtml?: boolean;
  byline?: string;
  license?: string;
  // NEWPI only: the press articles the reformulation was built from.
  sources?: { title: string; url: string }[];
};

export type VideoItem = {
  id: string;
  kind: "video";
  title: string;
  thumbnail: string | null;
  source: "youtube" | "twitch" | "twitter";
  embedUrl: string;
  channel: string;
  tag: string;
  // X posts only: a directly-playable mp4 (X blocks iframing, so the card
  // plays this natively) — absent for photo-only or text-only posts.
  mp4?: string;
};

export type FeedItem = ArticleItem | VideoItem;

export type EnvironmentConfig = {
  tags: string[];
  aiSuggestedTags: string[];
};

export type EnvironmentsState = Record<EnvironmentKey, EnvironmentConfig>;

export const DEFAULT_ENVIRONMENTS: EnvironmentsState = {
  monde: { tags: ["politique", "société", "international", "économie"], aiSuggestedTags: [] },
  tech: {
    tags: ["intelligence artificielle", "innovation", "développement web"],
    aiSuggestedTags: [],
  },
  culture: { tags: ["musique", "cinéma", "voyage"], aiSuggestedTags: [] },
};
