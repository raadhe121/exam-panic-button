import { askAI } from "@/lib/ai";
import { extractJson } from "@/lib/validate";

export const maxDuration = 30;

const SYSTEM = `You write quick self-check questions for a student who just studied a topic.
Reply with ONLY JSON: {"questions":[{"question":string,"options":[string,string,string,string],"answer":number,"explanation":string}]}.
Exactly 2 multiple-choice questions, 4 options each, "answer" is the 0-based index of the correct option, explanation is one short sentence. Keep them fair and basic: core ideas, not tricks.`;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { topic?: unknown; subject?: unknown } | null;
  const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 80) : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 40) : "";
  if (!topic) return Response.json({ error: "Missing topic." }, { status: 400 });

  const text = await askAI(SYSTEM, `Topic: ${topic}${subject ? ` (${subject})` : ""}`, 1200);
  const raw = (extractJson(text ?? "") as { questions?: unknown[] } | null)?.questions;
  const questions = (Array.isArray(raw) ? raw : [])
    .map((q) => {
      const o = q as Record<string, unknown>;
      const opts = Array.isArray(o.options) ? o.options.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
      if (typeof o.question !== "string" || opts.length !== 4) return null;
      if (!Number.isInteger(o.answer) || (o.answer as number) < 0 || (o.answer as number) > 3) return null;
      return { question: o.question.slice(0, 300), options: opts.map((x) => x.slice(0, 160)), answer: o.answer as number, explanation: typeof o.explanation === "string" ? o.explanation.slice(0, 240) : "" };
    })
    .filter((q) => q !== null)
    .slice(0, 2);
  if (!questions.length) return Response.json({ error: "Couldn't make a quick check right now." }, { status: 502 });
  return Response.json({ questions });
}
