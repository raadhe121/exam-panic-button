import type { StoredBlock } from "./storage";
import type { Topic } from "./types";

export function blockMatches(blockTopic: string | null, t: Topic) {
  if (!blockTopic) return false;
  const b = blockTopic.toLowerCase();
  const n = t.name.toLowerCase();
  return b === n || b.startsWith(`${n} (`);
}

/** Topics whose first study block isn't ticked off yet (including ones the plan skipped). */
export function remainingTopics(topics: Topic[], blocks: StoredBlock[], done: Record<number, boolean>): Topic[] {
  return topics.filter((t) => {
    const i = blocks.findIndex((b) => b.type === "study" && blockMatches(b.topic, t));
    return i === -1 || !done[i];
  });
}
