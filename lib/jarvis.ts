// Proxy to the Jarvis Universal API running on Bruno's VPS (Qwen2.5:3b via
// Ollama, port 9999). Same contract every project uses: POST /api/ask.
const JARVIS_API = process.env.JARVIS_API_URL || "http://46.202.131.240:9999";

async function askJarvis(question: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(`${JARVIS_API}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, project: "flip-library" }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Jarvis ${res.status}`);
  const data = await res.json();
  return data.answer || "";
}

export async function suggestTags(environment: string, existingTags: string[]): Promise<string[]> {
  const prompt =
    `Pour un univers de contenu "${environment}" avec ces centres d'intérêt existants: ${existingTags.join(", ") || "aucun"}. ` +
    `Suggère 5 nouveaux centres d'intérêt courts (1-3 mots) et pertinents, différents des existants. ` +
    `Réponds UNIQUEMENT avec une liste séparée par des virgules, sans phrase d'introduction.`;

  const answer = await askJarvis(prompt);
  return answer
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^[-•\d.]+\s*/, ""))
    .filter(Boolean)
    .slice(0, 5);
}

// Turns a scraped article body into an original French digest — same
// transformative treatment NEWPI already applies across sources. The source
// text is never returned to the client, only this reformulation is. Qwen2.5:3b
// on the VPS's shared 1-core box takes 30-60s for this, so callers must treat
// it as a background enrichment, never something the UI blocks on.
export async function digestArticle(text: string, source: string): Promise<string> {
  const prompt =
    `Voici le texte d'un article de presse publié par ${source} :\n\n${text}\n\n` +
    `Rédige un résumé fidèle en français, 4 à 6 phrases, qui reprend les faits et les chiffres ` +
    `présents dans le texte ci-dessus — n'invente aucun fait qui n'y figure pas. ` +
    `Réponds uniquement avec le résumé, sans titre ni introduction.`;

  const answer = await askJarvis(prompt, 90000);
  return answer.trim();
}

export async function classifyContent(title: string, environments: string[]): Promise<string> {
  const prompt =
    `Classe ce titre de contenu dans l'un de ces univers: ${environments.join(", ")}. ` +
    `Titre: "${title}". Réponds uniquement avec le nom de l'univers, rien d'autre.`;
  const answer = await askJarvis(prompt);
  const match = environments.find((e) => answer.toLowerCase().includes(e.toLowerCase()));
  return match || environments[0];
}
