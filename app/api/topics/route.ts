import { askAI } from "@/lib/ai";
import { normalizeTopics, parseSyllabusLocal } from "@/lib/syllabus";
import { extractJson } from "@/lib/validate";

export const maxDuration = 30;

const TOPIC_RULES = `Reply with ONLY JSON: {"topics":[{"name":string,"subject":string,"important":boolean}]}.
Rules: at most 15 topics; merge tiny items and drop admin text (dates, marks, instructions); each name under 60 characters; "subject" is the course name if clear, else "".
Set "important": true for at most 3 topics that exams usually weight most (core, foundational or high-mark ideas), false for the rest.`;

const SYSTEM = `You turn a pasted syllabus, chapter list or teacher's message into a short list of study topics.\n${TOPIC_RULES}`;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 6000) : "";
  if (text.length < 3) return Response.json({ error: "Paste your syllabus or chapter list first." }, { status: 400 });
  const reply = await askAI(SYSTEM, text, 1500);
  const ai = normalizeTopics((extractJson(reply ?? "") as { topics?: unknown } | null)?.topics);
  const topics = ai ?? parseSyllabusLocal(text);
  if (!topics.length) return Response.json({ error: "We couldn't find any topics in that text." }, { status: 422 });
  return Response.json({ topics, source: ai ? "ai" : "fallback" });
}
