import { DRAFT_RESULTS, type DraftResult } from "./tourScript.ts";

/** The wrong detail in the draft: the participant said they can only come on Saturday. */
const FRIDAY = /\b(fri(day)?|vendredi)\b/i;

/** Whether a sent offer still names Friday; `null` means nothing was sent. */
export function draftResult(sent: string | null): DraftResult {
  if (sent === null) return DRAFT_RESULTS.notSent;
  return FRIDAY.test(sent)
    ? DRAFT_RESULTS.fridayKept
    : DRAFT_RESULTS.fridayFixed;
}
