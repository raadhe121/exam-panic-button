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

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * A short, kind line for the current moment. It depends only on progress and the panic score, so it works
 * offline, costs no AI tokens and never changes between renders of the same state.
 */
export function coachLine({ studyDone, studyTotal, behind, stress, blockType }: CoachInput): string {
  const high = stress >= 4;
  const low = stress <= 2;
  const left = Math.max(0, studyTotal - studyDone);

  if (blockType === "sleep") return high ? "You did what you could. Rest now, your brain will sort the rest." : "Sleep is part of the plan. Switch off and let it sink in.";
  if (blockType === "revision") return high ? "Just a gentle skim. You already know more than you feel you do." : "Last lap. Skim, don't cram. You're nearly there.";
  if (blockType === "break") {
    if (studyDone === 0) return high ? "Breathe. There's nothing to catch up on yet." : "Settle in. The first block is coming up.";
    return high ? `${plural(studyDone, "block")} done. Drink some water. You're doing fine.` : `${plural(studyDone, "block")} done. Stretch, then back at it.`;
  }
  // Studying
  if (behind > 0 && !high) return "A little behind is normal. Focus on this block only.";
  if (behind > 0) return "Don't worry about the past. Just this one block, nothing else.";
  if (studyDone === 0) return high ? "One block at a time. Start with just five minutes." : low ? "Let's get going. The first block is the hardest." : "Begin with the big picture. You've got this.";
  if (left <= 1) return high ? "Almost there. This is the last one." : "Final stretch. Finish strong.";
  if (studyDone >= studyTotal / 2) return high ? `${plural(studyDone, "block")} done. You're ahead of where you think you are.` : `Over halfway: ${plural(studyDone, "block")} done. Keep the pace.`;
  return high ? `${plural(studyDone, "block")} done. Steady and calm, that's all it takes.` : `${plural(studyDone, "block")} done, ${left} to go. Nice rhythm.`;
}
