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
