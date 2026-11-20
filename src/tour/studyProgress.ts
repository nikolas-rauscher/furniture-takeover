import type {
  StudyContact,
  StudyLanguage,
  StudyStart,
} from "../../shared/study.ts";
import { tabStorage } from "./tabStorage.ts";
import type { StepAnswer } from "./tourScript.ts";

export type RecordedAnswer = StepAnswer & { elapsedMs: number };

/** Where a participant is, kept for the tab's life so a reload continues the session. */
export type StudyProgress = {
  session: string;
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

export function loadProgress(source: string): StoredProgress | null {
  const raw = tabStorage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  const stored = JSON.parse(raw) as StoredProgress;
  // A link from another channel starts a session of its own.
  return stored.progress.source === source ? stored : null;
}

export function storeProgress(stored: StoredProgress) {
  tabStorage()?.setItem(STORAGE_KEY, JSON.stringify(stored));
}
