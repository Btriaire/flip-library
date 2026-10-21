import { XMLParser } from "fast-xml-parser";
import DOMPurify from "isomorphic-dompurify";
import { ArticleItem } from "./types";
import { FeedNode, linkHref } from "./rssUtils";

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
//
// This is the only source in this app whose HTML gets rendered via
// dangerouslySetInnerHTML (ArticleReader.tsx) instead of shown as plain
// text — every other source's excerpt goes through stripHtml() first. That
// makes this the one place a compromised or MITM'd feed response could
// inject a script, so the body is sanitized here, at the point it's read
// from the network, rather than trusting the render site to remember to.
function sanitizeArticleHtml(html: string): string {
  const withoutFigures = html.replace(/<figure[\s\S]*?<\/figure>/g, "");
  return DOMPurify.sanitize(withoutFigures);
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

  const contentText = (entry: FeedNode): string =>
    (typeof entry.content === "string" ? entry.content : entry.content?.["#text"]) || "";

  const kw = tag.trim().toLowerCase();
  const matched = list.filter((entry: FeedNode) => {
    const haystack = `${entry.title || ""} ${contentText(entry)}`.toLowerCase();
    return haystack.includes(kw);
  });

  return matched.slice(0, 5).map((entry: FeedNode, i: number) => {
    const rawContent = contentText(entry);
    const author = entry.author?.name || null;
    const url = linkHref(entry.link);
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
      fullText: sanitizeArticleHtml(rawContent),
      fullTextIsHtml: true,
      byline: author ? `${author}, The Conversation` : "The Conversation",
      license: "CC BY-ND",
    } satisfies ArticleItem;
  });
}
