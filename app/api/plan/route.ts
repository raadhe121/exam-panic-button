import { planWithAI } from "@/lib/ai";
import { buildLocalPlan } from "@/lib/planner";
import { MAX_TOPICS, type PlanInput, type PlanResponse, type Rating } from "@/lib/types";

export const maxDuration = 30;

const RATINGS: Rating[] = ["know", "shaky", "noidea"];

function parseInput(body: unknown): PlanInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const { startMin, sleepMin, examMin } = b;
  if (![startMin, sleepMin, examMin].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const s = startMin as number;
  const z = sleepMin as number;
  const e = examMin as number;
  if (!(s < z && z < e)) return null;
  if (!Array.isArray(b.topics) || b.topics.length < 1 || b.topics.length > MAX_TOPICS) return null;
  const topics: PlanInput["topics"] = [];
  for (const [i, t] of b.topics.entries()) {
    if (!t || typeof t !== "object") return null;
    const o = t as Record<string, unknown>;
    if (typeof o.name !== "string" || !o.name.trim()) return null;
    if (!RATINGS.includes(o.rating as Rating)) return null;
    topics.push({
      id: typeof o.id === "string" ? o.id : String(i),
      name: o.name.trim().slice(0, 80),
      subject: typeof o.subject === "string" ? o.subject.trim().slice(0, 40) : "",
      rating: o.rating as Rating,
      starred: o.starred === true,
    });
  }
  return { startMin: s, sleepMin: z, examMin: e, topics, nap: typeof b.nap === "boolean" ? b.nap : undefined,
    stress: typeof b.stress === "number" && b.stress >= 1 && b.stress <= 5 ? Math.round(b.stress) : undefined };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const input = parseInput(body);
  if (!input) return Response.json({ error: "Please check your times and topics." }, { status: 400 });

  const ai = await planWithAI(input);
  const aiConfigured = Boolean(process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY);
  const res: PlanResponse = ai
    ? { plan: ai, source: "ai" }
    : { plan: buildLocalPlan(input), source: "fallback", aiFailed: aiConfigured };
  return Response.json(res);
}
