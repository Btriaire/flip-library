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
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&rsquo;|&lsquo;|&hellip;/g, (m) => HTML_ENTITIES[m])
    .trim();
}

function extractImage(item: any): string | null {
  const enclosure = item.enclosure;
  if (enclosure?.["@_url"]) return enclosure["@_url"];
  const mediaContent = item["media:content"];
  if (mediaContent?.["@_url"]) return mediaContent["@_url"];
  return null;
}

// Google News RSS: free, no API key, good keyword coverage in French/English.
export async function searchArticles(tag: string, lang = "fr"): Promise<ArticleItem[]> {
  const url =
    `https://news.google.com/rss/search?` +
    new URLSearchParams({
      q: tag,
      hl: lang,
      gl: lang === "fr" ? "FR" : "US",
      ceid: lang === "fr" ? "FR:fr" : "US:en",
    });

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Google News RSS ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const items = data?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return list.slice(0, 20).map((item: any, i: number) => {
    const rawTitle: string = item.title || "";
    const sourceName: string = item.source?.["#text"] || item.source || "Google News";
    return {
      id: `gnews-${tag}-${i}-${encodeURIComponent(item.link || rawTitle)}`,
      kind: "article",
      title: stripHtml(rawTitle),
      excerpt: stripHtml(item.description || ""),
      image: extractImage(item),
      source: sourceName,
      url: item.link,
      publishedAt: item.pubDate || null,
      tag,
    } satisfies ArticleItem;
  });
}
