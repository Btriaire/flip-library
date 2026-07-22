import { ArticleItem } from "./types";

type NewpiTheme = {
  id: string;
  label: string;
  article: string | null;
  sources: { title: string; url: string }[];
  generatedAt: string | null;
};

function deriveTitle(article: string, label: string): string {
  const firstLine = article.split("\n").find((l) => l.trim().length > 0) || "";
  const cleaned = firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  return cleaned.length > 10 && cleaned.length < 140 ? cleaned : `Actualité ${label}`;
}

// NEWPI: agent journaliste — reformulation IA fidèle d'articles de presse française
// croisés par thématique, générée côté serveur (Jarvis/VPS) et rafraîchie 2x/jour.
export async function loadNewpiFeed(): Promise<ArticleItem[]> {
  try {
    const res = await fetch("/api/newpi/digest");
    if (!res.ok) return [];
    const data = await res.json();
    const themes: NewpiTheme[] = data.themes || [];

    return themes
      .filter((t) => !!t.article)
      .map((t) => {
        const article = t.article as string;
        const excerpt = article.replace(/\n+/g, " ").trim().slice(0, 180) + "…";

        return {
          id: `newpi-${t.id}`,
          kind: "article",
          title: deriveTitle(article, t.label),
          excerpt,
          image: null,
          source: "NEWPI",
          url: t.sources[0]?.url || "https://www.google.com/search?q=" + encodeURIComponent(t.label + " actualité France"),
          publishedAt: t.generatedAt,
          tag: t.label,
          fullText: article,
          fullTextIsHtml: false,
          byline: t.sources.length ? `${t.sources.length} sources croisées` : undefined,
          license: "reformulé par IA à partir des sources ci-dessous",
          sources: t.sources,
        } satisfies ArticleItem;
      });
  } catch {
    return [];
  }
}
