/** Checks that a value an agent copied really stands in the words it quotes. */

/** Words as a quote compares them: any case, straight quote marks, single spaces. */
const comparable = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”«»„]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Whether a text contains a quote, as people copy quotes: whatever their case, quote marks or spacing. */
export const containsQuote = (text: string, quote: string) =>
  comparable(text).includes(comparable(quote));

/** The numbers a quote names, such as 40 in "Would you take 40?". */
export const quoteNumbers = (quote: string) =>
  quote
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((value) => Number(value.replace(",", "."))) ?? [];

const PICKUP_WORDS =
  /pick\W*(?:it\W*|them\W*)?up|collect|in.person|abhol|treffen|meet|retirer|recuperer|récupérer|chercher/i;
const SHIPPING_WORDS = /ship|post|versand|liefer|envoi|livraison/i;
const NO_SHIPPING =
  /no shipping|not.*ship|pickup only|kein.*versand|pas d'envoi|pas de livraison/i;

/** Whether a quote supports a pickup or a shipping handover. */
export function quoteSupportsHandover(
  quote: string,
  handover: "pickup" | "shipping",
): boolean {
  if (handover === "pickup") return PICKUP_WORDS.test(quote);
  return SHIPPING_WORDS.test(quote) && !NO_SHIPPING.test(quote);
}

/** Clock times and dates, whose numbers are no amounts: "18:00", "18h30", "6 pm", "18 Uhr", "20.11.", "20/11", "2026-11-20", "20 Nov". */
const CLOCK_TIMES_AND_DATES =
  /\b\d{1,2}(?:[:.h]\d{2}\b|\s?(?:h|uhr|am|pm)\b)|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\.?|\b\d{1,2}\.?\s?(?:jan|feb|fév|fev|mar|mär|apr|avr|may|mai|jun|juin|jul|juil|aug|août|aou|sep|oct|okt|nov|dec|déc|dez)/gi;

/** The amounts a message can mean: its numbers that are no clock times or dates, with "1'200" as 1200. */
export const messageAmounts = (text: string) =>
  [
    ...text.replace(CLOCK_TIMES_AND_DATES, " ").matchAll(/\d+(?:[',]\d{3})*/g),
  ].map(([number]) => Number(number.replace(/[',]/g, "")));

/** Clock times in the students' notations, each rewritten as 24-hour "HH:MM". */
const CLOCK_NOTATIONS: readonly (readonly [
  RegExp,
  (...parts: string[]) => string,
])[] = [
  [
    /\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/g,
    (hour, minute = "00", half) =>
      `${String((Number(hour) % 12) + (half === "pm" ? 12 : 0)).padStart(2, "0")}:${minute}`,
  ],
  [
    /\b(\d{1,2})(?:[:.](\d{2}))?\s?uhr\b/g,
    (hour, minute = "00") => `${hour.padStart(2, "0")}:${minute}`,
  ],
  [
    /\b(\d{1,2})h(\d{2})?\b/g,
    (hour, minute = "00") => `${hour.padStart(2, "0")}:${minute}`,
  ],
  [
    /\b(\d{1,2})[:.](\d{2})\b/g,
    (hour, minute) => `${hour.padStart(2, "0")}:${minute}`,
  ],
];
/** Words that only join a time's parts, as "at" does in "Thursday at 18:00". */
const TIME_FILLERS = new Set(["at", "on", "the", "um", "à", "le", "la", "de"]);

/** The parts a time is named by: its words, and its clock time as "HH:MM". */
function timeParts(text: string): string[] {
  const clocked = CLOCK_NOTATIONS.reduce(
    (written, [pattern, rewrite]) =>
      written.replace(pattern, (_match, ...groups: string[]) =>
        rewrite(...groups.slice(0, -2)),
      ),
    comparable(text),
  );
  return clocked.match(/\d{2}:\d{2}|[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Whether the texts name every part of a pickup's words, also when they are
 * spread over a sentence: "tomorrow 19:00" is named by "Tomorrow works, but
 * only after 19:00", "Friday 19:30" is not.
 */
export function namesTime(texts: readonly string[], words: string): boolean {
  const named = new Set(texts.flatMap(timeParts));
  const parts = timeParts(words).filter((part) => !TIME_FILLERS.has(part));
  return parts.length > 0 && parts.every((part) => named.has(part));
}
