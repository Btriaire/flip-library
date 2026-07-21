import { XMLParser } from "fast-xml-parser";
import { ArticleItem } from "./types";
import { stripHtml } from "./rssUtils";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// BFMTV's RSS feeds are public and category-based (no keyword search), so we
// map common tags to their closest category feed, falling back to the
// general "news-24-7" feed filtered by keyword match. Same treatment as
// every other news source in this app: title, image, short excerpt, link —
// no full article text.
const CATEGORY_MAP: Record<string, string> = {
  politique: "politique",
  économie: "economie",
  economie: "economie",
  business: "economie",
  international: "international",
  monde: "international",
  tech: "tech",
  technologie: "tech",
  "intelligence artificielle": "tech",
  sciences: "sciences",
  science: "sciences",
  culture: "culture",
  cinéma: "culture",
  cinema: "culture",
  musique: "culture",
  people: "people",
  santé: "sante",
  sante: "sante",
  animaux: "animaux",
  environnement: "environnement",
  climat: "environnement",
};

function parseFeed(xml: string, tag: string, filterKeyword?: string): ArticleItem[] {
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item;
  let list = Array.isArray(items) ? items : items ? [items] : [];

  if (filterKeyword) {
    const kw = filterKeyword.toLowerCase();
    list = list.filter((item: any) => {
      const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
      return haystack.includes(kw);
    });
  }

  return list.slice(0, 10).map((item: any, i: number) => {
    const link: string = item.link || "";
    return {
      id: `bfmtv-${tag}-${i}-${encodeURIComponent(link)}`,
      kind: "article",
      title: stripHtml(item.title || ""),
      excerpt: stripHtml(item.description || ""),
      image: item.enclosure?.["@_url"] || null,
      source: "BFMTV",
      url: link,
      publishedAt: item.pubDate || null,
      tag,
    } satisfies ArticleItem;
  });
}

export async function searchBfmtv(tag: string): Promise<ArticleItem[]> {
  const normalized = tag.trim().toLowerCase();
  const category = CATEGORY_MAP[normalized];

  const feedUrl = category
    ? `https://www.bfmtv.com/rss/${category}/`
    : `https://www.bfmtv.com/rss/news-24-7/`;

  const res = await fetch(feedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`BFMTV RSS ${res.status}`);
  const xml = await res.text();

  // Only keyword-filter when we fell back to the general feed — a matched
  // category feed is already on-topic.
  return parseFeed(xml, tag, category ? undefined : normalized);
}
