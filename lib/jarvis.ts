// Proxy to the Jarvis Universal API running on Bruno's VPS (Qwen2.5:3b via
// Ollama, port 9999). Same contract every project uses: POST /api/ask.
const JARVIS_API = process.env.JARVIS_API_URL || "http://46.202.131.240:9999";

async function askJarvis(question: string): Promise<string> {
  const res = await fetch(`${JARVIS_API}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, project: "flip-library" }),
    signal: AbortSignal.timeout(15000),
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

export async function classifyContent(title: string, environments: string[]): Promise<string> {
  const prompt =
    `Classe ce titre de contenu dans l'un de ces univers: ${environments.join(", ")}. ` +
    `Titre: "${title}". Réponds uniquement avec le nom de l'univers, rien d'autre.`;
  const answer = await askJarvis(prompt);
  const match = environments.find((e) => answer.toLowerCase().includes(e.toLowerCase()));
  return match || environments[0];
}
