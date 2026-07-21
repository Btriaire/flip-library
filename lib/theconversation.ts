import { XMLParser } from "fast-xml-parser";
import { ArticleItem } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// The Conversation France publishes under Creative Commons BY-ND, explicitly
// for free republication by other outlets (see their public
// "Règles de republication" page) — this is the legitimate case of an
// explicit open license for full text, same category as Wikipedia. Per
// their own terms we (a) show the article unmodified, (b) credit the
// author + The Conversation with a link, (c) drop their images rather than
// republish ones we don't have separate rights to (they explicitly permit
// removing images). There's no keyword search on their feed, so we filter
// their recent-articles feed by tag match.
function stripFigures(html: string): string {
  return html.replace(/<figure[\s\S]*?<\/figure>/g, "");
}

function getEntryLink(entry: any): string {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const alt = links.find((l: any) => l?.["@_rel"] === "alternate") || links[0];
  return alt?.["@_href"] || "";
}

export async function searchTheConversation(tag: string): Promise<ArticleItem[]> {
  const res = await fetch("https://theconversation.com/fr/articles.atom", {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`The Conversation ${res.status}`);
  const xml = await res.text();
  const data = parser.parse(xml);
  const entries = data?.feed?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];

  const kw = tag.trim().toLowerCase();
  const matched = list.filter((entry: any) => {
    const haystack = `${entry.title || ""} ${entry.content?.["#text"] || entry.content || ""}`.toLowerCase();
    return haystack.includes(kw);
  });

  return matched.slice(0, 5).map((entry: any, i: number) => {
    const rawContent: string = entry.content?.["#text"] || entry.content || "";
    const author = entry.author?.name || null;
    const url = getEntryLink(entry);
    return {
      id: `tc-${tag}-${i}-${encodeURIComponent(url)}`,
      kind: "article",
      title: entry.title || "",
      excerpt: "",
      image: null, // dropped per their republishing terms (safer than mis-licensed images)
      source: "The Conversation",
      url,
      publishedAt: entry.published || null,
      tag,
      fullText: stripFigures(rawContent),
      fullTextIsHtml: true,
      byline: author ? `${author}, The Conversation` : "The Conversation",
      license: "CC BY-ND",
    } satisfies ArticleItem;
  });
}
