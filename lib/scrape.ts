import { JSDOM } from "jsdom";

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Cheap head-only fetch to resolve a thumbnail for the feed card — Google
// News RSS almost never includes enclosure/media:content, so we backfill
// from the article page's own og:image/twitter:image meta tags (the same
// metadata any link-preview tool reads; no article body is fetched or kept).
export async function getArticleImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const og = doc.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    const tw = doc.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
    return og?.content || tw?.content || null;
  } catch {
    return null;
  }
}
