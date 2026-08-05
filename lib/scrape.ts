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

// Model input only — used to build an AI digest (see lib/jarvis.ts
// digestArticle) for sources whose RSS excerpt is short. The scraped text
// itself is never sent to the client or stored; only the reformulated digest
// is. Scoped to a single article page (fetched from the item's own RSS
// <link>), not a section/homepage listing — those are boilerplate, not body
// text, and feeding one to the model is what produced garbage in earlier
// testing.
const MODEL_INPUT_MAX = 4000;

export async function getArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const dom = new JSDOM(await res.text(), { url });
    const doc = dom.window.document;

    doc.querySelectorAll("script, style, nav, header, footer, aside, form").forEach((el) => el.remove());

    // Boilerplate that slips past the >60-char filter on French news sites —
    // account CTAs, video-transcript disclaimers — worth keeping out of what
    // the model reads as "the article".
    const isBoilerplate = (t: string) =>
      /^(pour sauvegarder cet article|connectez-vous|ce texte correspond à|cliquez sur la vidéo|abonnez-vous|partager cet article)/i.test(
        t
      );

    const scope = doc.querySelector("article") ?? doc.body;
    const text = Array.from(scope?.querySelectorAll("p") ?? [])
      .map((p) => p.textContent?.trim() ?? "")
      .filter((t) => t.length > 60 && !isBoilerplate(t))
      .join("\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    // A real article body is many short paragraphs; a listing/nav page
    // mostly isn't — this is what would have caught the flawed test.
    return text.length < 300 ? null : text.slice(0, MODEL_INPUT_MAX);
  } catch {
    return null;
  }
}

