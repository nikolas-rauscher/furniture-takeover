import type {
  StudyContact,
  StudyLanguage,
  StudyStart,
} from "../../shared/study.ts";
import { resumeFromTab, tabStorage, type Resumed } from "./tabStorage.ts";
import { STUDY_VERSION, type StepAnswer } from "./tourScript.ts";

export type RecordedAnswer = StepAnswer & { elapsedMs: number };

/** Where a participant is, kept for the tab's life so a reload continues the session. */
export type StudyProgress = {
  session: string;
  /** The wording version the session started in; it never continues in another one. */
  version: string;
  source: string;
  device: StudyStart["device"];
  /** The page's language when the session started. */
  language: StudyLanguage;
  stepId: string;
  answers: Record<string, RecordedAnswer>;
  /** Option orders as first shown, for steps that shuffle them. */
  orders: Record<string, string[]>;
  contact: StudyContact | null;
};

/** As kept in session storage, with the saves the server has not confirmed yet. */
export type StoredProgress = { progress: StudyProgress; unsaved: string[] };

const STORAGE_KEY = "takeover-study";

export function loadProgress(source: string): Resumed<StoredProgress> {
  return resumeFromTab<StoredProgress>(STORAGE_KEY, source, STUDY_VERSION);
}

export function storeProgress(stored: StoredProgress) {
  tabStorage()?.setItem(STORAGE_KEY, JSON.stringify(stored));
}
