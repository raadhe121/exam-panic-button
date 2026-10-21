export const DAY = 1440;

export const mod = (n: number, m: number) => ((n % m) + m) % m;

export function roundUp5(m: number) {
  return Math.ceil(m / 5) * 5;
}

export function roundDown5(m: number) {
  return Math.floor(m / 5) * 5;
}

export function fmt(m: number) {
  const d = mod(m, DAY);
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

export function parseHHMM(s: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Local epoch minutes for a Date (wall-clock time as if the timezone were UTC). */
export function toLocalMin(d: Date) {
  return Math.floor(d.getTime() / 60000) - d.getTimezoneOffset();
}

export function fromLocalMin(m: number) {
  const guess = new Date(m * 60000);
  return new Date((m + guess.getTimezoneOffset()) * 60000);
}

/** "2026-10-21T09:30" (datetime-local value) <-> local epoch minutes. */
export function inputToMin(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000);
}

export function minToInput(m: number) {
  return new Date(m * 60000).toISOString().slice(0, 16);
}

export function durationLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

/**
 * Turn HH:MM strings into absolute local-epoch minutes by walking forward from `from`.
 * Returns null if any block has zero length or the sequence is not contiguous-forward.
 */
export function resolveBlocks(
  blocks: { start: string; end: string }[],
  from: number,
): { startMin: number; endMin: number }[] | null {
  const out: { startMin: number; endMin: number }[] = [];
  let cursor = from;
  for (const b of blocks) {
    const s = parseHHMM(b.start);
    const e = parseHHMM(b.end);
    if (s === null || e === null) return null;
    const startMin = cursor + mod(s - cursor, DAY);
    const len = mod(e - s, DAY);
    if (len === 0) return null;
    out.push({ startMin, endMin: startMin + len });
    cursor = startMin + len;
  }
  return out;
}
