import type { V3Progress } from "./v3Progress.ts";
import {
  DRAFT_DAYS,
  DRAFT_RESULTS,
  type DraftDay,
  type DraftResult,
  type DraftWriting,
} from "./v3Script.ts";

/** What sending the written message records: Pako's words kept, changed, or replaced. */
export function sentResult(
  writing: DraftWriting,
  message: string,
  offer: string,
): DraftResult {
  if (writing === "own") return "sent-own";
  return message === offer ? "sent-unchanged" : "sent-changed";
}

/**
 * How the chat unfolds after the day is picked: Léa answers, Pako drafts the offer,
 * the participant decides what to do with it, maybe writes, and the result shows.
 */
export type DraftPhase =
  | "ask"
  | "lea-typing"
  | "pako-typing"
  | "decide"
  | "write"
  | "decided"
  | "review";

/** The draft's answer as saved: its options and the message. */
type SavedDraft = { chosen: string[]; text: string };

const isDay = (value: string | undefined): value is DraftDay =>
  DRAFT_DAYS.some((day) => day === value);

const isWriting = (value: string | undefined): value is DraftWriting =>
  value === "change" || value === "own";

const isResult = (value: string | undefined): value is DraftResult =>
  DRAFT_RESULTS.some((result) => result === value);

/**
 * Where a participant who reloaded mid-task picks up again: at the day, at the draft,
 * in the message they started, or at the decision they already made, which is shown
 * again and not asked a second time.
 */
export function resumeDraft(
  day: string | undefined,
  draft: SavedDraft | undefined,
  events: V3Progress["events"] = [],
): {
  day?: DraftDay;
  phase: DraftPhase;
  writing?: DraftWriting;
  decision?: SavedDraft;
} {
  if (!isDay(day)) return { phase: "ask" };
  const action = draft?.chosen[0];
  if (draft && isResult(action)) {
    // On a fresh visit the participant can revise the day and message. Reloading
    // just after Send still finishes the pending transition.
    const last = events
      .filter(
        (event) =>
          event.step === "draft" &&
          ["shown", "answered", "changed"].includes(event.kind),
      )
      .at(-1);
    return {
      day,
      phase: last?.kind === "shown" ? "review" : "decided",
      decision: draft,
    };
  }
  if (isWriting(action)) return { day, phase: "write", writing: action };
  return { day, phase: "decide" };
}
