import { NextRequest, NextResponse } from "next/server";
import { getArticleText } from "@/lib/scrape";
import { digestArticle } from "@/lib/jarvis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gives a card more than its one-line RSS teaser: fetch the article, have
// Jarvis write an original digest from it, return only that — the publisher's
// own text never crosses back to the client. Cached by URL for the life of the
// server (an article's text doesn't change), and requests for the same URL
// share one in-flight digest instead of re-running Jarvis per caller — this is
// what makes it safe for a card to call on every mount without hammering the
// VPS's shared box.
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

async function computeDigest(url: string, source: string): Promise<string | null> {
  const text = await getArticleText(url);
  if (!text) return null;
  const digest = await digestArticle(text, source);
  return digest || null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const source = req.nextUrl.searchParams.get("source") || "la source";
  if (!url) return NextResponse.json({ digest: null });

  const cached = cache.get(url);
  if (cached) return NextResponse.json({ digest: cached });

  try {
    const pending = inFlight.get(url) ?? computeDigest(url, source).finally(() => inFlight.delete(url));
    inFlight.set(url, pending);

    const digest = await pending;
    if (digest) cache.set(url, digest);
    return NextResponse.json({ digest });
  } catch (e) {
    return NextResponse.json({ digest: null, error: (e as Error).message }, { status: 502 });
  }
}
