export interface ParsedTopic {
  name: string;
  subject?: string;
  /** The AI's guess that this topic is usually among the most important. */
  important?: boolean;
}

/** Cleans a model's topic list: trims, drops empties and repeats, keeps at most 15 and 3 "important" flags. */
export function normalizeTopics(raw: unknown): ParsedTopic[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: ParsedTopic[] = [];
  let flagged = 0;
  for (const t of raw) {
    const o = (typeof t === "string" ? { name: t } : t) as { name?: unknown; subject?: unknown; important?: unknown } | null;
    if (typeof o?.name !== "string" || !o.name.trim()) continue;
    const name = o.name.trim().slice(0, 80);
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const important = o.important === true && flagged < 3;
    if (important) flagged++;
    out.push({
      name,
      subject: typeof o.subject === "string" && o.subject.trim() ? o.subject.trim().slice(0, 40) : undefined,
      ...(important ? { important } : {}),
    });
  }
  return out.length ? out.slice(0, 15) : null;
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
