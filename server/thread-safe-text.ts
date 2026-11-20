import { OTHER_TOKEN } from "../shared/threadTurn.ts";

const CONTACT_DETAILS = [
  /https?:\/\//i,
  /\bwww\./i,
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
  /\+?\d(?:[\s\-/().]?\d){6,}/,
];

/** Pako's words carry no links or contact details, and no placeholder but the other student's. */
export function checkSafeText(text: string, where: string) {
  if (CONTACT_DETAILS.some((pattern) => pattern.test(text)))
    throw new Error(
      `${where}: remove links, email addresses and phone numbers.`,
    );
  if (
    /\b(?:twint|paypal|iban|revolut|bank transfer|wire transfer|gift cards?|crypto)\b/i.test(
      text,
    ) ||
    /\b(?:prepay\w*|upfront payment|advance payment|paiement d'avance|vorkasse)\b|\b(?:pay\w*|send|transfer|deposit)\b[^.!?;]*\b(?:in advance|up ?front|ahead of time|before (?:pickup|collect\w*|meeting|delivery|shipping))\b/i.test(
      text,
    )
  )
    throw new Error(
      `${where}: leave payment methods and advance payment out of the reply.`,
    );
  if (/[{}]/.test(text.replaceAll(OTHER_TOKEN, "")))
    throw new Error(
      `${where}: the only placeholder allowed is ${OTHER_TOKEN}.`,
    );
}
