import type { PlanBlock, PlanResult, Topic } from "./types";

export const STORE_KEY = "epb:v1";

export interface TimingInputs {
  examAt: string;
  startAt: string;
  sleepAt: string;
  sleepTouched: boolean;
}

export interface StoredBlock extends PlanBlock {
  startMs: number;
  endMs: number;
}

export interface StoredPlan {
  summary: PlanResult["summary"];
  skipped: PlanResult["skipped"];
  blocks: StoredBlock[];
  done: Record<number, boolean>;
  source: "ai" | "fallback";
  nap: boolean;
  studyWindowMin: number;
  /** Exam start, for the morning-of screen. */
  examMs?: number;
  /** Set when the plan was rebuilt mid-night with "I'm behind". */
  replannedAt?: number;
  morningDone?: Record<number, boolean>;
}

export type Stage = "landing" | "timing" | "topics" | "generate" | "plan";

export interface AppState {
  stage: Stage;
  timing: TimingInputs;
  topics: Topic[];
  plan: StoredPlan | null;
  /** Set when this exam is saved to the user's account. */
  examId?: string | null;
  examName?: string;
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AppState;
    if (!s || typeof s !== "object" || !s.timing || !Array.isArray(s.topics)) return null;
    if (s.plan && !Array.isArray(s.plan.blocks)) s.plan = null;
    if (s.stage === "generate") s.stage = "topics";
    if (s.plan) s.stage = s.stage === "plan" ? "plan" : s.stage;
    return s;
  } catch {
    return null;
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: the app still works for this visit */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
