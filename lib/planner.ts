import { fmt, roundDown5, roundUp5 } from "./time";
import {
  NAP_MODE_MINUTES,
  type PlanBlock,
  type PlanInput,
  type PlanResult,
  type Rating,
  type Topic,
} from "./types";

const RANGE: Record<Rating, { min: number; max: number }> = {
  noidea: { min: 45, max: 60 },
  shaky: { min: 30, max: 40 },
  know: { min: 10, max: 15 },
};

/** Gentler lengths for students who say they're stressed (4 or 5 out of 5). */
const GENTLE_RANGE: Record<Rating, { min: number; max: number }> = {
  noidea: { min: 30, max: 40 },
  shaky: { min: 25, max: 30 },
  know: { min: 10, max: 10 },
};

export const isGentle = (stress?: number) => (stress ?? 3) >= 4;

const TIPS: Record<Rating, string[]> = {
  noidea: [
    "Start with the big picture, then write a 5-line summary in your own words.",
    "Learn the core definitions first, then try one simple example.",
    "Skim the chapter headings, then work through one solved example slowly.",
  ],
  shaky: [
    "Focus on formulas and 2 practice problems.",
    "Cover your notes and recall the key points, then check what you missed.",
    "Redo one question you got wrong before and note the mistake.",
  ],
  know: [
    "Quick skim of your notes. Just check nothing feels unfamiliar.",
    "Read your summary once and move on.",
    "Say the key ideas out loud in under a minute.",
  ],
};

const SECOND_PASS_TIP = "Second pass: test yourself without looking at notes.";
const REVISION_TIP = "Quick revision of everything: skim your notes, then stop.";

interface Entry {
  topic: Topic;
  minutes: number;
}

export function priorityRank(t: Topic): number {
  if (t.rating === "noidea") return t.starred ? 0 : 1;
  if (t.starred) return 2;
  return t.rating === "shaky" ? 3 : 4;
}

export function sortTopics(topics: Topic[]): Topic[] {
  return topics
    .map((t, i) => ({ t, i }))
    .sort((a, b) => priorityRank(a.t) - priorityRank(b.t) || a.i - b.i)
    .map((x) => x.t);
}

function baseMinutes(t: Topic, gentle: boolean) {
  const r = (gentle ? GENTLE_RANGE : RANGE)[t.rating];
  if (gentle) return r.max;
  return t.starred ? r.max : t.rating === "noidea" ? 50 : t.rating === "shaky" ? 35 : r.min;
}

/** Least important first; the planner shortens, then drops, tier by tier. */
function reductionTier(t: Topic): number {
  const base = { know: 0, shaky: 2, noidea: 4 }[t.rating];
  return base + (t.starred ? 1 : 0);
}

function breakAfter(minutes: number, sinceLong: number, gentle = false): { len: number; long: boolean } {
  if (sinceLong >= (gentle ? 80 : 110)) return { len: 25, long: true };
  if (gentle) return { len: 10, long: false };
  return { len: minutes > 35 ? 10 : 5, long: false };
}

function span(entries: Entry[], gentle = false) {
  let total = 0;
  let since = 0;
  for (const e of entries) {
    total += e.minutes;
    since += e.minutes;
    const b = breakAfter(e.minutes, since, gentle);
    total += b.len;
    since = b.long ? 0 : since + b.len;
  }
  return total;
}

export function napMode(input: PlanInput) {
  return input.nap ?? input.examMin - input.startMin < NAP_MODE_MINUTES;
}

export function buildLocalPlan(input: PlanInput): PlanResult {
  const start = roundUp5(input.startMin);
  const sleep = roundDown5(input.sleepMin);
  const exam = input.examMin;
  const nap = napMode(input);

  const sleepEnd = nap
    ? Math.min(sleep + 30, exam)
    : exam - sleep > 60
      ? Math.min(exam - 45, exam)
      : exam;

  const window = Math.max(0, sleep - start);
  const revisionLen = window >= 90 ? 25 : window >= 40 ? 20 : 0;
  const studyEnd = sleep - revisionLen;
  const available = Math.max(0, studyEnd - start);

  const gentle = isGentle(input.stress);
  const ordered = sortTopics(input.topics);
  if (gentle) {
    // Start with an easy win to build confidence, then continue in priority order.
    const warm = ordered.findIndex((t) => t.rating === "know" && !t.starred) >= 0
      ? ordered.findIndex((t) => t.rating === "know" && !t.starred)
      : ordered.findIndex((t) => t.rating === "shaky" && !t.starred);
    if (warm > 0) ordered.unshift(...ordered.splice(warm, 1));
  }
  const entries: Entry[] = ordered.map((topic) => ({ topic, minutes: baseMinutes(topic, gentle) }));
  const dropped: { topic: Topic; reason: string }[] = [];

  // Shorten, then drop, tier by tier (Know it first, starred No idea last).
  for (let tier = 0; tier <= 5 && span(entries, gentle) > available; tier++) {
    for (const e of entries) {
      if (reductionTier(e.topic) === tier) e.minutes = (gentle ? GENTLE_RANGE : RANGE)[e.topic.rating].min;
    }
    while (span(entries, gentle) > available) {
      let idx = -1;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (reductionTier(entries[i].topic) === tier) {
          idx = i;
          break;
        }
      }
      if (idx === -1) break;
      if (entries.length === 1 && available >= 15) break;
      const [gone] = entries.splice(idx, 1);
      dropped.push({
        topic: gone.topic,
        reason:
          gone.topic.rating === "know"
            ? "You said you know this one. It's covered in the final quick revision."
            : "Not enough time tonight. Skim it if you have a spare minute.",
      });
    }
  }

  // Last resort: still too long (tiny window). Trim remaining blocks to fit, in 5 min steps.
  if (span(entries, gentle) > available) {
    while (entries.length > 1 && span(entries, gentle) > available) {
      const gone = entries.pop()!;
      dropped.push({ topic: gone.topic, reason: "Not enough time tonight." });
    }
    if (entries.length === 1) {
      const e = entries[0];
      e.minutes = Math.max(5, Math.min(e.minutes, Math.floor((available - 5) / 5) * 5));
    }
  }

  // Surplus time goes to up to two extra passes over the hardest topics, then rest.
  const priority = entries.filter((e) => e.topic.rating !== "know").map((e) => e.topic);
  const secondPassStart = entries.length;

  const blocks: PlanBlock[] = [];
  let t = start;
  let since = 0;
  const queue = entries.slice();
  for (let i = 0; i < queue.length; i++) {
    const e = queue[i];
    const isSecond = i >= secondPassStart;
    const tips = TIPS[e.topic.rating];
    blocks.push({
      type: "study",
      topic: e.topic.subject ? `${e.topic.name} (${e.topic.subject})` : e.topic.name,
      start: fmt(t),
      end: fmt(t + e.minutes),
      tip: isSecond ? SECOND_PASS_TIP : gentle && i === 0 && e.topic.rating !== "noidea" ? "An easy start: a quick win to get you going." : tips[blocks.length % tips.length],
    });
    t += e.minutes;
    since += e.minutes;
    const b = breakAfter(e.minutes, since, gentle);
    const room = studyEnd - t;
    if (room > 0) {
      const len = Math.min(b.len, room);
      blocks.push({
        type: "break",
        topic: null,
        start: fmt(t),
        end: fmt(t + len),
        tip: b.long ? "Long break: walk, water, a snack. Step away from your notes." : "Stretch, drink water, rest your eyes.",
      });
      t += len;
      since = b.long ? 0 : since + len;
    }
    if (i === queue.length - 1 && queue.length - secondPassStart < priority.length * 2 && studyEnd - t >= 35) {
      queue.push({ topic: priority[(queue.length - secondPassStart) % priority.length], minutes: gentle ? 25 : 30 });
    }
  }

  // Fill any small leftover so the timeline has no gaps.
  if (t < studyEnd) {
    const last = blocks[blocks.length - 1];
    if (last && last.type === "break") {
      last.end = fmt(studyEnd);
      last.tip = "Free time: rest, eat, or revisit your weakest topic.";
    } else {
      blocks.push({ type: "break", topic: null, start: fmt(t), end: fmt(studyEnd), tip: "Stretch, drink water, rest your eyes." });
    }
    t = studyEnd;
  }

  if (revisionLen > 0) {
    blocks.push({ type: "revision", topic: "Quick revision of everything", start: fmt(t), end: fmt(sleep), tip: REVISION_TIP });
    t = sleep;
  } else if (t < sleep) {
    blocks.push({ type: "break", topic: null, start: fmt(t), end: fmt(sleep), tip: "Wind down before sleep." });
  }

  if (sleepEnd > sleep) {
    blocks.push({
      type: "sleep",
      topic: nap ? "Short nap" : "Sleep",
      start: fmt(sleep),
      end: fmt(sleepEnd),
      tip: nap
        ? "A short nap helps more than staying awake. Set an alarm."
        : "Sleep is part of the plan. Your memory needs it.",
    });
  }

  return finalize(blocks, dropped.map((d) => ({ topic: d.topic.name, reason: d.reason })), start, sleep, gentle);
}

export function finalize(
  blocks: PlanBlock[],
  skipped: { topic: string; reason: string }[],
  start: number,
  sleep: number,
  gentle = false,
): PlanResult {
  let studyMinutes = 0;
  const covered = new Set<string>();
  for (const b of blocks) {
    if (b.type !== "study") continue;
    studyMinutes += span2(b);
    if (b.topic) covered.add(b.topic);
  }
  const revision = blocks.find((b) => b.type === "revision");
  if (revision) studyMinutes += span2(revision);
  const windowMins = sleep - start;
  let message = skipped.length
    ? "You can't cover everything tonight. Here's the best use of your time."
    : "You have enough time to cover everything. Take it one block at a time.";
  if (gentle) message = `We kept this plan gentle: ${message.startsWith("You can't") ? "shorter blocks, more breaks and an easy start. You can't cover everything tonight, and that's okay." : "shorter blocks, more breaks and an easy start. You've got this."}`;
  if (windowMins < 60) message = "You have less than an hour tonight, so this is a short plan. Do what you can, calmly.";
  return { summary: { studyMinutes, topicsCovered: covered.size, message }, blocks, skipped };
}

function span2(b: { start: string; end: string }) {
  const [sh, sm] = b.start.split(":").map(Number);
  const [eh, em] = b.end.split(":").map(Number);
  return (((eh * 60 + em - (sh * 60 + sm)) % 1440) + 1440) % 1440;
}
