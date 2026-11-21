import type { V3Progress } from "./v3Progress.ts";
import {
  PACK_ANSWERS,
  PACK_PRICES,
  PACK_START,
  packAnswerStep,
  type PackAnswer,
  type PackPrice,
} from "./v3Script.ts";

type Sheet = Pick<V3Progress, "answers">;

/** Where the ladder stands: the prices asked so far, and the price to ask next. */
export type Ladder = {
  asked: { price: PackPrice; answer: PackAnswer }[];
  /** Null once the ladder is done. */
  next: PackPrice | null;
};

function answerAt(sheet: Sheet, price: PackPrice): PackAnswer | undefined {
  const chosen = sheet.answers[packAnswerStep(price)]?.chosen[0];
  return PACK_ANSWERS.find((answer) => answer === chosen);
}

/**
 * Gabor–Granger with two questions at most: after "yes" the next higher price,
 * after "no" the next lower one; "not sure" stops it.
 */
function followUp(answer: PackAnswer): PackPrice | null {
  if (answer === "not-sure") return null;
  const index = PACK_PRICES.indexOf(PACK_START) + (answer === "yes" ? 1 : -1);
  const next: PackPrice | undefined = PACK_PRICES[index];
  if (next === undefined)
    throw new Error("The pack ladder needs a price on each side of its start.");
  return next;
}

/** The ladder from the participant's stored answers; everyone starts at the same price. */
export function ladderOf(sheet: Sheet): Ladder {
  const first = answerAt(sheet, PACK_START);
  if (!first) return { asked: [], next: PACK_START };
  const asked = [{ price: PACK_START, answer: first }];
  const second = followUp(first);
  if (second === null) return { asked, next: null };
  const secondAnswer = answerAt(sheet, second);
  if (!secondAnswer) return { asked, next: second };
  return {
    asked: [...asked, { price: second, answer: secondAnswer }],
    next: null,
  };
}
