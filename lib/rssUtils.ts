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
