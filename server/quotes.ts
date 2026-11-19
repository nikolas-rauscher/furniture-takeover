/** Checks that a value an agent copied really stands in the words it quotes. */

/** The numbers a quote names, such as 40 in "Would you take 40?". */
export const quoteNumbers = (quote: string) =>
  quote
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((value) => Number(value.replace(",", "."))) ?? [];

const PICKUP_WORDS =
  /pickup|pick.up|collect|in.person|abhol|treffen|meet|retirer|recuperer|récupérer|chercher/i;
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
