import type {
  StudyEvents,
  StudyLanguage,
  StudyPilot,
  StudyStart,
} from "../../../shared/study.ts";
import { resumeFromTab, tabStorage, type Resumed } from "../tabStorage.ts";
import { V3_VERSION } from "./v3Script.ts";

export type V3Answer = {
  chosen: string[];
  /** The options of the first answer to the step; going back does not change them. */
  firstChosen: string[];
  shown: string[];
  text: string;
  elapsedMs: number;
};

type StudyEvent = StudyEvents["events"][number];

/** Where a v3 participant is, kept for the tab's life so a reload continues the session. */
export type V3Progress = {
  session: string;
  /** The wording version the session started in; it never continues in another one. */
  version: string;
  source: string;
  device: StudyStart["device"];
  /** The page's language when the session started; switches are recorded as events. */
  language: StudyLanguage;
  stepId: string;
  answers: Record<string, V3Answer>;
  /** Option orders as first shown, for steps that shuffle them. */
  orders: Record<string, string[]>;
  /** Everything recorded so far, in order; `seq` is the position. */
  events: StudyEvent[];
  /** Events already handed to the save queue. */
  queuedEvents: number;
  pilot: StudyPilot | null;
};

/** As kept in session storage, with the saves the server has not confirmed yet. */
export type StoredV3 = { progress: V3Progress; unsaved: string[] };

const STORAGE_KEY = "takeover-study-v3";
const FINISHED_KEY = "takeover-study-finished";

export function loadV3(source: string): Resumed<StoredV3> {
  return resumeFromTab<StoredV3>(STORAGE_KEY, source, V3_VERSION);
}

export function storeV3(stored: StoredV3) {
  tabStorage()?.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/**
 * Local storage is missing in some private windows; there the browser cannot remember
 * a finished survey, which the consent text allows for, so the problem is only reported.
 */
function deviceStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn(
      "Local storage is unavailable; a finished survey is not remembered.",
      error,
    );
    return null;
  }
}

/** This browser finished the core once, so it is not asked a second time. */
export function rememberFinished() {
  deviceStorage()?.setItem(FINISHED_KEY, new Date().toISOString());
}

export function finishedBefore(): boolean {
  return Boolean(deviceStorage()?.getItem(FINISHED_KEY));
}
