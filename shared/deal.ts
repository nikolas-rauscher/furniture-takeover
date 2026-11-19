import { z } from "zod";
import { zurichClockTime } from "./pickupTime.ts";

export type DealRole = "buyer" | "seller";
export type DealTermField =
  "amount" | "fulfillment" | "pickupTime" | "pickupPoint";

/** An exact UTC instant, as the server and the database store pickups. */
export const isoInstantSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);

/**
 * Terms both students read: whole francs (0 is free), the handover, the
 * pickup as an exact instant together with the words they used, and a meeting
 * point. Unknown terms are null.
 */
export const dealTermsSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000).nullable(),
    fulfillment: z.enum(["pickup", "shipping"]).nullable(),
    pickupAt: isoInstantSchema.nullable(),
    pickupTime: z.string().trim().min(1).max(240).nullable(),
    pickupPoint: z.string().trim().min(1).max(240).nullable(),
  })
  .strict()
  .refine(
    (terms) => terms.pickupAt === null || terms.pickupTime !== null,
    "A pickup instant needs the words both students read.",
  );
export type DealTerms = z.infer<typeof dealTermsSchema>;

/** What a deal on these terms still needs: a price and either shipping or a concrete pickup. */
export function missingTerms(terms: DealTerms): DealTermField[] {
  const missing: DealTermField[] = [];
  if (terms.amount === null) missing.push("amount");
  if (terms.fulfillment === null) missing.push("fulfillment");
  if (terms.fulfillment !== "shipping") {
    if (terms.pickupAt === null) missing.push("pickupTime");
    if (terms.pickupPoint === null) missing.push("pickupPoint");
  }
  return missing;
}

export const termsComplete = (terms: DealTerms) =>
  missingTerms(terms).length === 0;

/** Words that state a price of zero in the languages students write in. */
const FREE_WORDS = /\b(?:free|gratuit|gratuite|gratis|kostenlos)\b/i;

/** "CHF 1'200", "CHF 1,200", "chf1200": the amount's digits after CHF, and no digit after them. */
function statesAmount(body: string, amount: number): boolean {
  const digits = String(amount).replace(/(\d)(?=(\d{3})+$)/g, "$1[,' ]?");
  if (new RegExp(`chf ?${digits}(?![0-9])`, "i").test(body)) return true;
  return amount === 0 && FREE_WORDS.test(body);
}

const containsWords = (body: string, words: string) =>
  body.toLowerCase().includes(words.toLowerCase());

/**
 * Whether a message says the terms it records, so both students read exactly
 * what they confirm: the price as "CHF n" (or "free"), the pickup's Zurich
 * clock time as HH:MM (or its words while it has no exact time) and the
 * meeting point as written.
 */
export function messageStatesTerms(
  body: string,
  terms: DealTerms,
): { ok: true } | { ok: false; missing: ("amount" | "time" | "point")[] } {
  const missing: ("amount" | "time" | "point")[] = [];
  if (terms.amount !== null && !statesAmount(body, terms.amount))
    missing.push("amount");
  const time =
    terms.pickupAt !== null
      ? zurichClockTime(terms.pickupAt)
      : terms.pickupTime;
  if (time !== null && !containsWords(body, time)) missing.push("time");
  if (terms.pickupPoint !== null && !containsWords(body, terms.pickupPoint))
    missing.push("point");
  return missing.length ? { ok: false, missing } : { ok: true };
}
