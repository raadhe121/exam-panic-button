import { askAI } from "@/lib/ai";
import { aiLanguageNote, parseLang } from "@/lib/i18n";
import { extractJson } from "@/lib/validate";

export const maxDuration = 30;

const SYSTEM = `You help a stressed student quickly revise one topic the night before an exam.
Reply with ONLY JSON: {"bullets":[string,string,string,string,string],"trick":string}.
Exactly 5 bullets, each one short sentence (under 25 words) covering the core ideas in plain words. "trick" is one memorable mnemonic, analogy or picture (under 30 words). Be accurate and calm.`;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { topic?: unknown; subject?: unknown; lang?: unknown } | null;
  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 80) : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 40) : "";
  if (!topic) return Response.json({ error: "Missing topic." }, { status: 400 });

  const text = await askAI(SYSTEM + aiLanguageNote(parseLang(body?.lang)), `Topic: ${topic}${subject ? ` (${subject})` : ""}`, 1100);
  const j = extractJson(text ?? "") as { bullets?: unknown; trick?: unknown } | null;
  const bullets = (Array.isArray(j?.bullets) ? j.bullets : []).filter((b): b is string => typeof b === "string" && !!b.trim()).map((b) => b.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").slice(0, 220)).slice(0, 5);
  if (bullets.length < 3) return Response.json({ error: "Couldn't explain that right now. Try again in a moment." }, { status: 502 });
  return Response.json({ bullets, trick: typeof j?.trick === "string" ? j.trick.slice(0, 260) : "" });
}
