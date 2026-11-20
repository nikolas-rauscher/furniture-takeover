import type { StudyStart } from "../../shared/study.ts";

const PHONE_QUERY = "(hover: none) and (pointer: coarse)";

/** A touch screen without hover counts as a phone; everything else as a computer. */
export function deviceClass(): StudyStart["device"] {
  return window.matchMedia(PHONE_QUERY).matches ? "phone" : "desktop";
}
