import { XMLParser } from "fast-xml-parser";
import { ArticleItem } from "./types";
import { attrUrl, FeedNode, linkHref, stripHtml } from "./rssUtils";
import { Category, categoryForTag } from "./categories";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

type NewsSource = {
  id: string;
  name: string;
  // Used when the tag maps to no desk we know a feed for — keyword-filtered.
  feed: string;
  byCategory?: Partial<Record<Category, string>>;
};

// Registry of French news outlets, replacing the one-file-per-source pattern.
// Every URL here was checked to return a parseable feed. Same treatment as the
// rest of the app: headline, image, excerpt, link out — no full body is stored
// or republished, whatever the feed happens to carry.
export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "franceinfo",
    name: "France Info",
    feed: "https://www.francetvinfo.fr/titres.rss",
    byCategory: {
      politique: "https://www.francetvinfo.fr/politique.rss",
      economie: "https://www.francetvinfo.fr/economie.rss",
      international: "https://www.francetvinfo.fr/monde.rss",
      culture: "https://www.francetvinfo.fr/culture.rss",
      sciences: "https://www.francetvinfo.fr/sciences.rss",
    },
  },
  {
    id: "lemonde",
    name: "Le Monde",
    feed: "https://www.lemonde.fr/rss/une.xml",
    byCategory: {
      politique: "https://www.lemonde.fr/politique/rss_full.xml",
      economie: "https://www.lemonde.fr/economie/rss_full.xml",
      international: "https://www.lemonde.fr/international/rss_full.xml",
      culture: "https://www.lemonde.fr/culture/rss_full.xml",
      tech: "https://www.lemonde.fr/pixels/rss_full.xml",
    },
  },
  {
    id: "20minutes",
    name: "20 Minutes",
    feed: "https://www.20minutes.fr/feeds/rss-une.xml",
    byCategory: {
      politique: "https://www.20minutes.fr/feeds/rss-politique.xml",
      economie: "https://www.20minutes.fr/feeds/rss-economie.xml",
      international: "https://www.20minutes.fr/feeds/rss-monde.xml",
      culture: "https://www.20minutes.fr/feeds/rss-culture.xml",
      tech: "https://www.20minutes.fr/feeds/rss-high-tech.xml",
    },
  },
  {
    id: "ouestfrance",
    name: "Ouest-France",
    feed: "https://www.ouest-france.fr/rss/une",
  },
  { id: "lacroix", name: "La Croix", feed: "https://www.la-croix.com/RSS" },
  { id: "rfi", name: "RFI", feed: "https://www.rfi.fr/fr/rss" },
  { id: "france24", name: "France 24", feed: "https://www.france24.com/fr/rss" },
  { id: "euronews", name: "Euronews", feed: "https://fr.euronews.com/rss" },
  {
    id: "alternatives-eco",
    name: "Alternatives Économiques",
    feed: "https://www.alternatives-economiques.fr/rss.xml",
  },
  // Desk-specific outlets below. Their whole feed is on-topic, so the keyword
  // filter is what keeps them out of unrelated decks. They also carry the most
  // text by a wide margin — see EXCERPT_MAX.
  {
    id: "reporterre",
    name: "Reporterre",
    feed: "https://reporterre.net/spip.php?page=backend",
  },
  { id: "vert", name: "Vert", feed: "https://vert.eco/feed" },
  { id: "numerama", name: "Numerama", feed: "https://www.numerama.com/feed/" },
  { id: "nextink", name: "Next", feed: "https://www.next.ink/feed/" },
];

function firstImgSrc(html: string): string | null {
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function imageFor(item: FeedNode, body: string): string | null {
  return (
    attrUrl(item.enclosure) ||
    attrUrl(item["media:content"]) ||
    attrUrl(item["media:thumbnail"]) ||
    (body ? firstImgSrc(body) : null)
  );
}

// Feeds carry wildly different amounts of text: ~160 chars at 20 Minutes,
// ~1300 at Reporterre, and a full body in <content:encoded> at Next and Vert.
// We take the longest available and cut it here, so a card reads as a real
// teaser instead of a headline — but never republishes a whole article.
// `fullText` stays reserved for explicitly open-licensed sources (see the note
// on ArticleItem).
const EXCERPT_MAX = 1400;

function excerptFor(item: FeedNode, body: string): string {
  const long = body ? stripHtml(body) : "";
  const short = stripHtml(item.description || "");
  const text = long.length > short.length ? long : short;
  return text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX).trimEnd()}…` : text;
}

// "Économie" and "economie" have to match, and a two-word tag shouldn't need
// the words glued together ("développement web" vs "développement … web").
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchesTag(item: FeedNode, tag: string): boolean {
  // Outlets that syndicate the body leave <description> nearly empty, so the
  // haystack has to include content:encoded or they never match at all.
  const haystack = normalize(
    `${item.title || ""} ${item.description || ""} ${item["content:encoded"] || ""}`
  );
  const words = normalize(tag).split(/\s+/).filter((w) => w.length >= 3);
  return words.length ? words.every((w) => haystack.includes(w)) : haystack.includes(normalize(tag));
}

function parseFeed(xml: string, source: NewsSource, tag: string, filterTag?: string): ArticleItem[] {
  const data = parser.parse(xml);
  const raw = data?.rss?.channel?.item ?? data?.feed?.entry;
  let list: FeedNode[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if (filterTag) list = list.filter((item) => matchesTag(item, filterTag));

  return list.slice(0, 6).map((item, i) => {
    const body: string = item["content:encoded"] || "";
    const link = linkHref(item.link);
    return {
      id: `${source.id}-${tag}-${i}-${encodeURIComponent(link || item.title || "")}`,
      kind: "article",
      title: stripHtml(item.title || ""),
      excerpt: excerptFor(item, body),
      image: imageFor(item, body),
      source: source.name,
      url: link,
      publishedAt: item.pubDate || item["dc:date"] || null,
      tag,
    } satisfies ArticleItem;
  });
}

async function searchOne(source: NewsSource, tag: string): Promise<ArticleItem[]> {
  const category = categoryForTag(tag);
  const categoryFeed = category ? source.byCategory?.[category] : undefined;

  const res = await fetch(categoryFeed ?? source.feed, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${source.name} ${res.status}`);

  // A matched desk feed is already on-topic; a generic feed is not, so it only
  // contributes items that actually mention the tag.
  return parseFeed(await res.text(), source, tag, categoryFeed ? undefined : tag);
}

export async function searchNews(tag: string): Promise<ArticleItem[]> {
  const settled = await Promise.allSettled(NEWS_SOURCES.map((s) => searchOne(s, tag)));

  const seen = new Set<string>();
  return settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((item) => {
      if (!item.url || !item.title) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
}
