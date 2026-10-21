import type { StoredBlock, StoredPlan } from "./storage";

/**
 * Adds a 10-minute revisit block for `topic` in the first future break of at least 20 minutes
 * (carved from the start of that break). Returns the new plan, or null if there's no room.
 * Done-flags are shifted so ticked blocks stay ticked.
 */
export function addRevisit(plan: StoredPlan, topic: string, now: number): StoredPlan | null {
  const TEN = 10 * 60000;
  const idx = plan.blocks.findIndex((b) => b.type === "break" && b.startMs > now && b.endMs - b.startMs >= 20 * 60000);
  if (idx === -1) return null;
  const br = plan.blocks[idx];
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const revisit: StoredBlock = {
    type: "study",
    topic: `${topic} (revisit)`,
    start: fmt(br.startMs),
    end: fmt(br.startMs + TEN),
    tip: "Quick revisit: redo the part you got wrong.",
    startMs: br.startMs,
    endMs: br.startMs + TEN,
  };
  const rest: StoredBlock = { ...br, start: fmt(br.startMs + TEN), startMs: br.startMs + TEN };
  const blocks = [...plan.blocks.slice(0, idx), revisit, rest, ...plan.blocks.slice(idx + 1)];
  const done: Record<number, boolean> = {};
  for (const [k, v] of Object.entries(plan.done)) {
    const n = Number(k);
    done[n > idx ? n + 1 : n] = v;
  }
  return { ...plan, blocks, done };
}
