import {
  DRAFT_DAYS,
  DRAFT_RESULTS,
  type DraftDay,
  type DraftResult,
  type DraftWriting,
} from "./v3Script.ts";

/**
 * What sending the written message records: Pako's words kept, changed, or replaced.
 * The offer is the one drafted for the participant's variant, so a message that keeps
 * the wrong price of that draft counts as unchanged.
 */
export function sentResult(
  writing: DraftWriting,
  message: string,
  offer: string,
): DraftResult {
  if (writing === "own") return "sent-own";
  return message === offer ? "sent-unchanged" : "sent-changed";
}

/** An amount with CHF or francs before or after it; a time such as 17.30 has neither. */
const PRICE =
  /(?:CHF|SFr\.?|Fr\.)\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:CHF|francs?\b|Fr\.|\.[-–])/gi;

/**
 * The price named in a sent message, as an option id: `chf-45` for one price, `several`
 * when it names different prices, `no-price` when it names none.
 */
export function sentPrice(message: string): string {
  const prices = new Set(
    [...message.matchAll(PRICE)].map((match) =>
      Number((match[1] ?? match[2]).replace(",", ".")),
    ),
  );
  if (prices.size === 0) return "no-price";
  if (prices.size > 1) return "several";
  const [price] = prices;
  return `chf-${String(price).replace(".", "-")}`;
}

/**
 * How the chat unfolds after the day is picked: Mia answers, Pako drafts the offer,
 * the participant decides what to do with it, maybe writes, and the result shows.
 */
export type DraftPhase =
  "ask" | "mia-typing" | "pako-typing" | "decide" | "write" | "decided";

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
): {
  day?: DraftDay;
  phase: DraftPhase;
  writing?: DraftWriting;
  decision?: SavedDraft;
} {
  if (!isDay(day)) return { phase: "ask" };
  const action = draft?.chosen[0];
  if (draft && isResult(action))
    return { day, phase: "decided", decision: draft };
  if (isWriting(action)) return { day, phase: "write", writing: action };
  return { day, phase: "decide" };
}
