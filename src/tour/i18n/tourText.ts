import type { StudyLanguage } from "../../../shared/study.ts";
import { DE } from "./de.ts";
import { EN, type TourText } from "./en.ts";
import { FR } from "./fr.ts";

export const TOUR_TEXT: Record<StudyLanguage, TourText> = {
  en: EN,
  fr: FR,
  de: DE,
};

/** A calendar date such as 13 December 2026, in the page's language. */
export function formatDay(isoDate: string, text: TourText) {
  return new Intl.DateTimeFormat(text.locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
