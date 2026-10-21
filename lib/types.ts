export type Rating = "know" | "shaky" | "noidea";

export interface Topic {
  id: string;
  name: string;
  subject: string;
  rating: Rating;
  starred: boolean;
}

/** All times are "local epoch minutes": minutes since 1970 in the student's wall-clock time. */
export interface PlanInput {
  startMin: number;
  sleepMin: number;
  examMin: number;
  topics: Topic[];
  /** Force nap or full-sleep mode (used when re-planning mid-night). */
  nap?: boolean;
  /** 1 (calm) to 5 (panicking). 4 and 5 give a gentler plan. */
  stress?: number;
}

export type BlockType = "study" | "break" | "revision" | "sleep";

export interface PlanBlock {
  type: BlockType;
  topic: string | null;
  start: string; // HH:MM
  end: string; // HH:MM
  tip: string;
}

export interface PlanResult {
  summary: { studyMinutes: number; topicsCovered: number; message: string };
  blocks: PlanBlock[];
  skipped: { topic: string; reason: string }[];
}

export interface PlanResponse {
  plan: PlanResult;
  source: "ai" | "fallback";
  /** True when an AI key is set but the AI call failed or its plan was rejected. */
  aiFailed?: boolean;
}

export const MAX_TOPICS = 15;
export const NAP_MODE_MINUTES = 7 * 60;
export const MIN_GOOD_SLEEP_MINUTES = 6 * 60;

export const RATING_LABEL: Record<Rating, string> = {
  know: "Know it",
  shaky: "Shaky",
  noidea: "No idea",
};
