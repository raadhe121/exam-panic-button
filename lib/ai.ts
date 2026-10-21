import { fmt, roundDown5, roundUp5 } from "./time";
import { extractJson, validatePlan } from "./validate";
import { napMode } from "./planner";
import { RATING_LABEL, type PlanInput, type PlanResult } from "./types";

const SYSTEM = `You are a calm study planner. Reply with ONLY a JSON object, no prose, no code fences.
Shape:
{"summary":{"studyMinutes":number,"topicsCovered":number,"message":string},
 "blocks":[{"type":"study"|"break"|"revision"|"sleep","topic":string|null,"start":"HH:MM","end":"HH:MM","tip":string}],
 "skipped":[{"topic":string,"reason":string}]}
Rules (must all hold):
- Blocks are back to back (each start equals the previous end), 24h HH:MM, all times multiples of 5 minutes.
- The first block starts at the study start time. The last block is a single "sleep" block that starts exactly at the sleep time. Never schedule study after the sleep time.
- Order study topics: "No idea" and starred topics first, then "Shaky", then "Know it".
- Study lengths: No idea 45-60 min, Shaky 30-40 min, Know it 10-15 min.
- A 5-10 min break after every study block; one 20-30 min break about every 2 hours.
- The block just before sleep is type "revision", topic "Quick revision of everything", 20-30 min.
- If time is too short, shorten or drop "Know it" topics first, then "Shaky". Avoid dropping starred "No idea" topics. List dropped topics in "skipped" with a short kind reason.
- For study blocks, "topic" is the topic name exactly as given (add " (Subject)" if a subject is given). "tip" is one short, encouraging sentence.
- "message" is one calm sentence. Tone: reassuring, never alarming.`;

export function buildPrompt(input: PlanInput): string {
  const topics = input.topics
    .map((t, i) => `${i + 1}. ${t.name}${t.subject ? ` (${t.subject})` : ""} | ${RATING_LABEL[t.rating]} | ${t.starred ? "starred" : "not starred"}`)
    .join("\n");
  const nap = napMode(input);
  return `Study start time: ${fmt(roundUp5(input.startMin))}
${nap ? "Nap" : "Sleep"} time (sleep block starts here): ${fmt(roundDown5(input.sleepMin))}
Sleep block ends at: ${fmt(nap ? Math.min(roundDown5(input.sleepMin) + 30, input.examMin) : input.examMin - roundDown5(input.sleepMin) > 60 ? input.examMin - 45 : input.examMin)}
Exam time: ${fmt(input.examMin)}
${nap ? "The exam is under 7 hours away, so the sleep block is a short 30 minute nap (topic \"Short nap\").\n" : ""}Topics:
${topics}`;
}

/** Calls the Anthropic Messages API from the server. Returns the reply text, or null on any failure. */
export async function askClaude(system: string, user: string, maxTokens = 4000): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return data.content?.find((c) => c.type === "text")?.text ?? null;
  } catch {
    return null;
  }
}

export async function planWithAI(input: PlanInput): Promise<PlanResult | null> {
  const text = await askClaude(SYSTEM, buildPrompt(input));
  return text ? validatePlan(extractJson(text), input) : null;
}
