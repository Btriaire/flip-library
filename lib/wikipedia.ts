import { ArticleItem } from "./types";

// Wikipedia's REST API is the legitimate version of "full text from an
// explicit open API": documented, versioned, and its content is CC BY-SA —
// openly licensed for reuse with attribution. We show the lead extract (the
// same summary the API is designed to hand out for external reuse), with a
// clear link back to the full article — not the entire encyclopedia entry.
export async function searchWikipedia(tag: string, lang = "fr"): Promise<ArticleItem[]> {
  const searchUrl =
    `https://${lang}.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: tag,
      format: "json",
      srlimit: "3",
      origin: "*",
    });

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Wikipedia search ${searchRes.status}`);
  const searchData = await searchRes.json();
  const titles: string[] = (searchData.query?.search || []).map((r: any) => r.title);

  const summaries = await Promise.all(
    titles.map(async (title) => {
      try {
        const res = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
        );
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    })
  );

  return summaries
    .filter((s): s is any => !!s && s.extract)
    .map((s) => ({
      id: `wiki-${lang}-${s.pageid}`,
      kind: "article",
      title: s.title,
      excerpt: s.description || "",
      image: s.thumbnail?.source || null,
      source: "Wikipédia",
      url: s.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(s.title)}`,
      publishedAt: null,
      tag,
      fullText: s.extract,
      license: "CC BY-SA",
    } satisfies ArticleItem));
}
