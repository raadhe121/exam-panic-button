import { askClaude } from "@/lib/ai";
import { parseSyllabusLocal, type ParsedTopic } from "@/lib/syllabus";
import { extractJson } from "@/lib/validate";

export const maxDuration = 30;

const SYSTEM = `You turn a pasted syllabus or chapter list into a short list of study topics.
Reply with ONLY JSON: {"topics":[{"name":string,"subject":string}]}.
Rules: at most 15 topics; merge tiny items and drop admin text (dates, marks, instructions); each name under 60 characters; "subject" is the course name if clear, else "".`;

async function viaAI(text: string): Promise<ParsedTopic[] | null> {
  const reply = await askClaude(SYSTEM, text, 1500);
  const raw = (extractJson(reply ?? "") as { topics?: unknown[] } | null)?.topics;
  if (!Array.isArray(raw)) return null;
  const out: ParsedTopic[] = [];
  for (const t of raw) {
    const o = t as { name?: unknown; subject?: unknown };
    if (typeof o?.name !== "string" || !o.name.trim()) continue;
    out.push({ name: o.name.trim().slice(0, 80), subject: typeof o.subject === "string" && o.subject.trim() ? o.subject.trim().slice(0, 40) : undefined });
  }
  return out.length ? out.slice(0, 15) : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 6000) : "";
  if (text.length < 3) return Response.json({ error: "Paste your syllabus or chapter list first." }, { status: 400 });
  const ai = await viaAI(text);
  const topics = ai ?? parseSyllabusLocal(text);
  if (!topics.length) return Response.json({ error: "We couldn't find any topics in that text." }, { status: 422 });
  return Response.json({ topics, source: ai ? "ai" : "fallback" });
}
