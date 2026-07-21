import { XMLParser } from "fast-xml-parser";
import { ArticleItem } from "./types";
import { stripHtml } from "./rssUtils";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Basta! publishes under CC BY-NC-ND (see their CGU), but their public RSS
// feed only carries a short excerpt — not the full body — so this stays
// the same metadata treatment as every other news source in this app:
// title, short excerpt, link. No per-article page fetch.
export async function searchBasta(tag: string): Promise<ArticleItem[]> {
  const res = await fetch("https://basta.media/spip.php?page=backend", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Basta! RSS ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  const kw = tag.trim().toLowerCase();
  const matched = list.filter((item: any) => {
    const haystack = `${item.title || ""} ${item.description || ""}`.toLowerCase();
    return haystack.includes(kw);
  });

  return matched.slice(0, 10).map((item: any, i: number) => {
    const link: string = item.link || "";
    return {
      id: `basta-${tag}-${i}-${encodeURIComponent(link)}`,
      kind: "article",
      title: stripHtml(item.title || ""),
      excerpt: stripHtml(item.description || ""),
      image: null,
      source: "Basta!",
      url: link,
      publishedAt: item["dc:date"] || null,
      tag,
    } satisfies ArticleItem;
  });
}
