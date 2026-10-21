export interface HistoryEntry {
  id: string;
  name: string;
  examMs: number;
  topics: number;
  total: number;
  done: number;
  updatedAt: number;
}

const KEY = "epb:history";

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.examMs - a.examMs) : [];
  } catch {
    return [];
  }
}

function save(list: HistoryEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage unavailable */
  }
}

export function upsertHistory(entry: HistoryEntry) {
  const list = loadHistory().filter((e) => e.id !== entry.id);
  save([entry, ...list]);
}

export function removeHistory(id: string) {
  save(loadHistory().filter((e) => e.id !== id));
}

export function clearHistory() {
  save([]);
}
