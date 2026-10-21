import type { TFn } from "./i18n";

export interface CoachInput {
  /** Study blocks ticked off so far (revisits and revision not counted). */
  studyDone: number;
  studyTotal: number;
  /** Study blocks from earlier that are still unticked. */
  behind: number;
  /** 1 (calm) to 5 (panicking). */
  stress: number;
  blockType: "study" | "break" | "revision" | "sleep";
}

/**
 * A short, kind line for the current moment. It depends only on progress and the panic score, so it works
 * offline, costs no AI tokens and never changes between renders of the same state.
 */
export function coachLine({ studyDone, studyTotal, behind, stress, blockType }: CoachInput, t: TFn): string {
  const high = stress >= 4;
  const low = stress <= 2;
  const left = Math.max(0, studyTotal - studyDone);
  const n = studyDone;

  if (blockType === "sleep") return t(high ? "You did what you could. Rest now, your brain will sort the rest." : "Sleep is part of the plan. Switch off and let it sink in.");
  if (blockType === "revision") return t(high ? "Just a gentle skim. You already know more than you feel you do." : "Last lap. Skim, don't cram. You're nearly there.");
  if (blockType === "break") {
    if (n === 0) return t(high ? "Breathe. There's nothing to catch up on yet." : "Settle in. The first block is coming up.");
    return t(high ? "{done} done. Drink some water. You're doing fine." : "{done} done. Stretch, then back at it.", { done: n === 1 ? t("1 block") : t("{n} blocks", { n }) });
  }
  // Studying
  if (behind > 0 && !high) return t("A little behind is normal. Focus on this block only.");
  if (behind > 0) return t("Don't worry about the past. Just this one block, nothing else.");
  if (n === 0) return t(high ? "One block at a time. Start with just five minutes." : low ? "Let's get going. The first block is the hardest." : "Begin with the big picture. You've got this.");
  const doneLabel = n === 1 ? t("1 block") : t("{n} blocks", { n });
  if (left <= 1) return t(high ? "Almost there. This is the last one." : "Final stretch. Finish strong.");
  if (n >= studyTotal / 2) return t(high ? "{done} done. You're ahead of where you think you are." : "Over halfway: {done} done. Keep the pace.", { done: doneLabel });
  return t(high ? "{done} done. Steady and calm, that's all it takes." : "{done} done, {left} to go. Nice rhythm.", { done: doneLabel, left });
}
