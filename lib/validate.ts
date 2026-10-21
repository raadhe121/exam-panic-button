import { finalize, isGentle } from "./planner";
import { resolveBlocks, roundDown5, roundUp5 } from "./time";
import type { BlockType, PlanBlock, PlanInput, PlanResult } from "./types";

const TYPES: BlockType[] = ["study", "break", "revision", "sleep"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRounded(s: string) {
  return Number(s.slice(3)) % 5 === 0;
}

/**
 * Checks an untrusted plan (from the AI) against the shape and the hard planning rules.
 * Returns a cleaned plan with a recomputed summary, or null if anything is wrong.
 */
export function validatePlan(raw: unknown, input: PlanInput): PlanResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.blocks) || !r.blocks.length || r.blocks.length > 80) return null;
  if (!Array.isArray(r.skipped)) return null;

  const blocks: PlanBlock[] = [];
  for (const b of r.blocks) {
    if (!b || typeof b !== "object") return null;
    const o = b as Record<string, unknown>;
    if (!TYPES.includes(o.type as BlockType)) return null;
    if (typeof o.start !== "string" || !HHMM.test(o.start) || !isRounded(o.start)) return null;
    if (typeof o.end !== "string" || !HHMM.test(o.end) || !isRounded(o.end)) return null;
    if (typeof o.tip !== "string") return null;
    if (o.topic !== null && typeof o.topic !== "string") return null;
    blocks.push({
      type: o.type as BlockType,
      topic: o.topic as string | null,
      start: o.start,
      end: o.end,
      tip: o.tip.slice(0, 200),
    });
  }

  const skipped: { topic: string; reason: string }[] = [];
  for (const s of r.skipped) {
    if (!s || typeof s !== "object") return null;
    const o = s as Record<string, unknown>;
    if (typeof o.topic !== "string" || typeof o.reason !== "string") return null;
    skipped.push({ topic: o.topic.slice(0, 120), reason: o.reason.slice(0, 200) });
  }

  const start = roundUp5(input.startMin);
  const sleep = roundDown5(input.sleepMin);
  const times = resolveBlocks(blocks, start);
  if (!times) return null;

  // Contiguous, no overlaps, starts at the chosen start time.
  if (times[0].startMin !== start) return null;
  for (let i = 1; i < times.length; i++) if (times[i].startMin !== times[i - 1].endMin) return null;

  // Sleep is protected: exactly one sleep block, starting at sleep time, nothing after it but wake-up.
  const sleepIdx = blocks.findIndex((b) => b.type === "sleep");
  if (sleepIdx !== blocks.length - 1 || blocks.filter((b) => b.type === "sleep").length !== 1) return null;
  if (times[sleepIdx].startMin !== sleep) return null;
  if (times[sleepIdx].endMin > input.examMin) return null;
  for (let i = 0; i < sleepIdx; i++) if (times[i].endMin > sleep) return null;

  // Final block before sleep is the quick revision.
  if (sleep - start >= 40 && blocks[sleepIdx - 1]?.type !== "revision") return null;

  // Study blocks only use known topics; ordering follows the rating rules.
  const names = input.topics.map((t) => t.name.toLowerCase());
  const rankOf = (blockTopic: string) => {
    const lower = blockTopic.toLowerCase();
    const idx = input.topics.findIndex((t, i) => lower === names[i] || lower.startsWith(`${names[i]} (`));
    return idx;
  };
  let lastRank = -1;
  const seen = new Set<number>();
  for (const b of blocks) {
    if (b.type !== "study") continue;
    if (!b.topic) return null;
    const idx = rankOf(b.topic);
    if (idx === -1) return null;
    if (seen.has(idx)) continue; // second passes may repeat
    seen.add(idx);
    const t = input.topics[idx];
    const rank = t.rating === "noidea" || t.starred ? 0 : t.rating === "shaky" ? 1 : 2;
    if (rank < lastRank && !isGentle(input.stress)) return null;
    lastRank = rank;
  }

  // Block length sanity: breaks should be short, study blocks at least 5 min.
  for (let i = 0; i < blocks.length; i++) {
    const len = times[i].endMin - times[i].startMin;
    if (blocks[i].type === "study" && (len < 5 || len > 90)) return null;
    if (blocks[i].type === "break" && len > 300) return null;
  }

  // Never drop a starred "No idea" topic if it can be avoided: it must be scheduled or explicitly skipped.
  for (const t of input.topics) {
    if (t.rating === "noidea" && t.starred && !seen.has(input.topics.indexOf(t))) {
      if (!skipped.some((s) => s.topic.toLowerCase() === t.name.toLowerCase())) return null;
    }
  }

  const plan = finalize(blocks, skipped, start, sleep, isGentle(input.stress));
  if (typeof (r.summary as { message?: unknown })?.message === "string") {
    plan.summary.message = ((r.summary as { message: string }).message).slice(0, 240);
  }
  return plan;
}

/** Pull a JSON object out of a model reply, tolerating code fences or stray prose. */
export function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a === -1 || b <= a) return null;
    try {
      return JSON.parse(cleaned.slice(a, b + 1));
    } catch {
      return null;
    }
  }
}
