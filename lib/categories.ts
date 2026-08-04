// Shared vocabulary between the news sources: a user tag is free text
// ("intelligence artificielle", "cinéma"), but every outlet organises its
// feeds around the same handful of desks. Mapping tag → desk lets us hit a
// topical feed instead of keyword-filtering a generic homepage feed.
export type Category =
  | "politique"
  | "economie"
  | "international"
  | "societe"
  | "culture"
  | "tech"
  | "sciences"
  | "environnement"
  | "sport";

const TAG_TO_CATEGORY: Record<string, Category> = {
  politique: "politique",
  gouvernement: "politique",
  élections: "politique",
  elections: "politique",

  économie: "economie",
  economie: "economie",
  entreprises: "economie",
  finance: "economie",
  emploi: "economie",
  business: "economie",

  international: "international",
  monde: "international",
  géopolitique: "international",
  geopolitique: "international",
  europe: "international",

  société: "societe",
  societe: "societe",
  social: "societe",
  éducation: "societe",
  education: "societe",
  justice: "societe",
  santé: "societe",
  sante: "societe",

  culture: "culture",
  cinéma: "culture",
  cinema: "culture",
  musique: "culture",
  livres: "culture",
  littérature: "culture",
  litterature: "culture",
  série: "culture",
  serie: "culture",
  séries: "culture",
  art: "culture",

  tech: "tech",
  technologie: "tech",
  numérique: "tech",
  numerique: "tech",
  "intelligence artificielle": "tech",
  ia: "tech",
  innovation: "tech",
  "développement web": "tech",
  "developpement web": "tech",
  informatique: "tech",
  startup: "tech",
  internet: "tech",

  sciences: "sciences",
  science: "sciences",
  espace: "sciences",
  recherche: "sciences",

  environnement: "environnement",
  climat: "environnement",
  écologie: "environnement",
  ecologie: "environnement",
  énergie: "environnement",
  energie: "environnement",

  sport: "sport",
  football: "sport",
  rugby: "sport",
  tennis: "sport",
};

export function categoryForTag(tag: string): Category | null {
  return TAG_TO_CATEGORY[tag.trim().toLowerCase()] ?? null;
}
