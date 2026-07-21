import { XMLParser } from "fast-xml-parser";
import { ArticleItem } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&hellip;": "…",
};

function stripHtml(html: string): string {
  const noTags = html.replace(/<[^>]*>/g, "");
  return noTags
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&rsquo;|&lsquo;|&hellip;/g, (m) => HTML_ENTITIES[m])
    .trim();
}

// Bing News wraps the real article link in a tracking redirect
// (bing.com/news/apiclick.aspx?...&url=<encoded>&...) — the actual URL is
// just a query param, no need to follow the redirect to read it.
function unwrapBingLink(link: string): string {
  try {
    const wrapped = new URL(link);
    return wrapped.searchParams.get("url") || link;
  } catch {
    return link;
  }
}

// Bing News RSS: free, no API key, and — unlike Google News RSS — gives a
// direct thumbnail (News:Image) plus the real publisher link, so no article
// page needs to be fetched just to find a photo. Its terms explicitly allow
// personal, non-commercial RSS-aggregator use (see the feed's own
// <copyright> notice), which matches this app.
export async function searchArticles(tag: string, market = "fr-FR"): Promise<ArticleItem[]> {
  const url =
    `https://www.bing.com/news/search?` +
    new URLSearchParams({ q: tag, format: "RSS", setmkt: market });

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Bing News RSS ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return list.slice(0, 20).map((item: any, i: number) => {
    const rawTitle: string = item.title || "";
    const sourceName: string = stripHtml(item["News:Source"] || "Bing News");
    const link = unwrapBingLink(item.link || "");
    return {
      id: `bing-${tag}-${i}-${encodeURIComponent(link || rawTitle)}`,
      kind: "article",
      title: stripHtml(rawTitle),
      excerpt: stripHtml(item.description || ""),
      image: item["News:Image"] || null,
      source: sourceName,
      url: link,
      publishedAt: item.pubDate || null,
      tag,
    } satisfies ArticleItem;
  });
}
