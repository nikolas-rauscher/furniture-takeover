import type { V3Progress } from "./v3Progress.ts";
import {
  PACK_ANSWERS,
  PACK_LADDER_STEP,
  PACK_PRICES,
  packAnswerStep,
  packPriceId,
  type PackAnswer,
  type PackPrice,
} from "./v3Script.ts";

type Sheet = Pick<V3Progress, "answers" | "orders">;

/** Where the ladder stands: its start, the prices asked so far, and the price to ask next. */
export type Ladder = {
  start: PackPrice;
  asked: { price: PackPrice; answer: PackAnswer }[];
  /** Null once the ladder is done. */
  next: PackPrice | null;
};

function priceOf(id: string | undefined): PackPrice {
  const price = PACK_PRICES.find((candidate) => packPriceId(candidate) === id);
  if (price === undefined)
    throw new Error(`The pack ladder has no start price "${id}".`);
  return price;
}

function answerAt(sheet: Sheet, price: PackPrice): PackAnswer | undefined {
  const chosen = sheet.answers[packAnswerStep(price)]?.chosen[0];
  return PACK_ANSWERS.find((answer) => answer === chosen);
}

/**
 * Gabor–Granger with two questions at most: after "yes" the next higher price,
 * after "no" the next lower one; "not sure" or the end of the ladder stops it.
 */
function followUp(start: PackPrice, answer: PackAnswer): PackPrice | null {
  const index = PACK_PRICES.indexOf(start);
  if (answer === "yes") return PACK_PRICES[index + 1] ?? null;
  if (answer === "no") return PACK_PRICES[index - 1] ?? null;
  return null;
}

/** The ladder from the participant's stored answers and the start price drawn for them. */
export function ladderOf(sheet: Sheet): Ladder {
  const start = priceOf(sheet.orders[PACK_LADDER_STEP]?.[0]);
  const first = answerAt(sheet, start);
  if (!first) return { start, asked: [], next: start };
  const asked = [{ price: start, answer: first }];
  const second = followUp(start, first);
  if (second === null) return { start, asked, next: null };
  const secondAnswer = answerAt(sheet, second);
  if (!secondAnswer) return { start, asked, next: second };
  return {
    start,
    asked: [...asked, { price: second, answer: secondAnswer }],
    next: null,
  };
}

/** One of the prices, drawn once per participant so earlier prices anchor no one the same way. */
export function drawStart(random: () => number): string {
  const price = PACK_PRICES[Math.floor(random() * PACK_PRICES.length)];
  return packPriceId(price);
}
