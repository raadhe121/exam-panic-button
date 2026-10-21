export interface ParsedTopic {
  name: string;
  subject?: string;
}

/** Rule-based syllabus splitter: one topic per line (or per comma if it's a single line). */
export function parseSyllabusLocal(text: string): ParsedTopic[] {
  let parts = text.split(/\r?\n|;/);
  if (parts.filter((p) => p.trim()).length <= 1) parts = text.split(/,|•/);
  const seen = new Set<string>();
  const out: ParsedTopic[] = [];
  for (const raw of parts) {
    const name = raw
      .replace(/^\s*(?:[-*•–]|\d+[.)]|(?:unit|chapter|ch|module|topic)\s*\d+\s*[:.\-)]?)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (name.length < 3 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ name });
  }
  return out.slice(0, 15);
}
