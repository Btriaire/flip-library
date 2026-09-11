// fast-xml-parser's parse() return type is genuinely `any` -- real-world RSS
// and Atom feeds vary in which of these show up, and some (link, enclosure,
// media:*) come back as a single object or an array the moment a tag repeats.
// This names the shape every source in this app actually reads instead of
// leaving each call site to fend for itself with `any`; it's deliberately
// loose (every field optional, plus an index signature) rather than a strict
// RSS/Atom schema, since that's the honest contract for untrusted feed XML.
export type FeedAttrNode = {
  "@_href"?: string;
  "@_url"?: string;
  "@_rel"?: string;
};

export type FeedNode = {
  title?: string;
  description?: string;
  link?: string | FeedAttrNode | FeedAttrNode[];
  pubDate?: string;
  "dc:date"?: string;
  "content:encoded"?: string;
  enclosure?: FeedAttrNode | FeedAttrNode[];
  "media:content"?: FeedAttrNode | FeedAttrNode[];
  "media:thumbnail"?: FeedAttrNode | FeedAttrNode[];
  "News:Source"?: string;
  "News:Image"?: string;
  // Atom-only fields (theconversation.ts).
  content?: string | { "#text"?: string };
  author?: { name?: string };
  published?: string;
  [key: string]: unknown;
};

// `<link>` shows up three ways across the outlets this app reads: plain text
// (most RSS 2.0 feeds), a single self-closing `<link href="...">` (some feed
// generators), or an array of those the moment an entry has more than one
// (Atom's rel="alternate" vs rel="self"). One helper for all three beats each
// source re-deriving its own narrowing -- and defends every source, not just
// the Atom one, if a feed generator ever changes shape.
export function linkHref(link: FeedNode["link"]): string {
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    const alt = link.find((l) => l["@_rel"] === "alternate") ?? link[0];
    return alt?.["@_href"] ?? "";
  }
  return link?.["@_href"] ?? "";
}

// enclosure / media:content / media:thumbnail all carry the image URL as an
// @_url attribute, and any of them can repeat into an array -- same "take
// the first" resolution fast-xml-parser forces on every attribute-bearing tag.
export function attrUrl(node: FeedAttrNode | FeedAttrNode[] | undefined): string | null {
  if (!node) return null;
  const first = Array.isArray(node) ? node[0] : node;
  return first?.["@_url"] || null;
}

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

export function stripHtml(html: string): string {
  const noTags = html.replace(/<[^>]*>/g, "");
  return noTags
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&rsquo;|&lsquo;|&hellip;/g, (m) => HTML_ENTITIES[m])
    .trim();
}
