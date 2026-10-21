import { finalize, isGentle } from "./planner";
import { fmt, parseHHMM, resolveBlocks, roundDown5, roundUp5 } from "./time";
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

  // Models sometimes pad spare time with dozens of 10-minute breaks. Merge back-to-back breaks into one.
  for (let i = blocks.length - 1; i > 0; i--) {
    if (blocks[i].type === "break" && blocks[i - 1].type === "break") {
      blocks[i - 1] = { ...blocks[i - 1], end: blocks[i].end, tip: "Free time: rest, eat, or revisit your weakest topic." };
      blocks.splice(i, 1);
    }
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


/**
 * Models are decent at the order of a plan but sloppy at clock arithmetic (27-minute blocks, small gaps).
 * This snaps block lengths to 5 minutes, re-chains them from the start time and makes the study time exactly
 * fill the window before sleep. It never invents topics, so validatePlan still has the final say.
 */
export function repairPlan(raw: unknown, input: PlanInput): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.blocks)) return raw;
  const all = r.blocks.filter((b): b is Record<string, unknown> => !!b && typeof b === "object");
  const body = all.filter((b) => b.type !== "sleep");
  const sleepBlock = all.find((b) => b.type === "sleep");
  if (!sleepBlock || all.filter((b) => b.type === "sleep").length !== 1 || !body.length) return raw;

  const start = roundUp5(input.startMin);
  const sleep = roundDown5(input.sleepMin);
  const lens: number[] = [];
  for (const b of body) {
    const s = typeof b.start === "string" ? parseHHMM(b.start) : null;
    const e = typeof b.end === "string" ? parseHHMM(b.end) : null;
    if (s === null || e === null) return raw;
    lens.push(Math.max(5, Math.round((((e - s) % 1440) + 1440) % 1440 / 5) * 5));
  }

  let spare = sleep - start - lens.reduce((a, b) => a + b, 0);
  const out: (Record<string, unknown> & { len: number })[] = body.map((b, i) => ({ ...b, len: lens[i] }));
  if (spare > 0) {
    // Leftover time becomes one free-time break just before the final revision.
    const at = out.length - 1 >= 0 && out[out.length - 1].type === "revision" ? out.length - 1 : out.length;
    out.splice(at, 0, { type: "break", topic: null, tip: "Free time: water, a snack, a short walk.", len: spare });
  } else if (spare < 0) {
    for (const b of out) {
      if (b.type !== "break" || spare === 0) continue;
      const cut = Math.min(-spare, b.len - 5);
      if (cut > 0) { b.len -= cut; spare += cut; }
    }
    if (spare < 0) return raw;
  }

  if (!isGentle(input.stress)) {
    // Hardest topics first: re-sort the study blocks by rating, keeping breaks and revision where they are.
    const rank = (topic: unknown) => {
      const lower = typeof topic === "string" ? topic.toLowerCase() : "";
      const t = input.topics.find((x) => lower === x.name.toLowerCase() || lower.startsWith(`${x.name.toLowerCase()} (`));
      return !t ? 3 : t.rating === "noidea" || t.starred ? 0 : t.rating === "shaky" ? 1 : 2;
    };
    const study = out.filter((b) => b.type === "study");
    const sorted = study
      .map((b, i) => ({ b, i }))
      .sort((x, y) => rank(x.b.topic) - rank(y.b.topic) || x.i - y.i)
      .map((x) => x.b);
    let k = 0;
    for (let i = 0; i < out.length; i++) if (out[i].type === "study") out[i] = sorted[k++];
  }

  let cursor = start;
  const blocks = out.map((b) => {
    const { len, ...rest } = b;
    const block = { ...rest, start: fmt(cursor), end: fmt(cursor + len) };
    cursor += len;
    return block;
  });
  const sleepEnd = typeof sleepBlock.end === "string" ? parseHHMM(sleepBlock.end) : null;
  if (sleepEnd === null) return raw;
  return { ...r, blocks: [...blocks, { ...sleepBlock, start: fmt(sleep), end: fmt(roundDown5(sleepEnd)) }] };
}
