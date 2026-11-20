import { STUDY_LANGUAGES, type StudyLanguage } from "../../../shared/study.ts";
import { tabStorage } from "../tabStorage.ts";

const STORAGE_KEY = "takeover-tour-language";

function isLanguage(value: string | null): value is StudyLanguage {
  return STUDY_LANGUAGES.some((language) => language === value);
}

/** The first of the browser's languages the page speaks, English otherwise. */
export function browserLanguage(preferred: readonly string[]): StudyLanguage {
  const match = preferred
    .map((tag) => tag.slice(0, 2).toLowerCase())
    .find(isLanguage);
  return match ?? "en";
}

/** The language chosen earlier in this tab, or the browser's. */
export function initialLanguage(): StudyLanguage {
  const chosen = tabStorage()?.getItem(STORAGE_KEY) ?? null;
  return isLanguage(chosen) ? chosen : browserLanguage(navigator.languages);
}

export function rememberLanguage(language: StudyLanguage) {
  tabStorage()?.setItem(STORAGE_KEY, language);
}
