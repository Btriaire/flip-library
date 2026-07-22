export type EnvironmentKey = "perso" | "pro" | "other";

export const ENVIRONMENTS: { key: EnvironmentKey; label: string }[] = [
  { key: "perso", label: "Perso" },
  { key: "pro", label: "Pro" },
  { key: "other", label: "Other" },
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
  // Set for sources with an explicit open license/API for full content
  // (Wikipedia REST API CC BY-SA; The Conversation France CC BY-ND — never
  // scraped from a publisher's page), OR for NEWPI (source: "NEWPI") — a
  // transformative AI reformulation across several press sources, not a
  // verbatim reproduction, always shipped with `sources` below and clearly
  // labelled via `license`. Absent for regular news items, which link out
  // instead.
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
  source: "youtube" | "twitch";
  embedUrl: string;
  channel: string;
  tag: string;
};

export type FeedItem = ArticleItem | VideoItem;

export type EnvironmentConfig = {
  tags: string[];
  aiSuggestedTags: string[];
};

export type EnvironmentsState = Record<EnvironmentKey, EnvironmentConfig>;

export const DEFAULT_ENVIRONMENTS: EnvironmentsState = {
  perso: { tags: ["musique", "voyage", "cinéma"], aiSuggestedTags: [] },
  pro: { tags: ["intelligence artificielle", "développement web"], aiSuggestedTags: [] },
  other: { tags: ["actualités", "sciences"], aiSuggestedTags: [] },
};
