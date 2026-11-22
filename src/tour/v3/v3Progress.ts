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
  /** Raised with every save of this answer; the server keeps the newest. */
  revision: number;
};

type StudyEvent = StudyEvents["events"][number];

/** Where a v3 participant is, kept for the tab's life so a reload continues the session. */
export type V3Progress = {
  session: string;
  /** The wording version the session started in; it never continues in another one. */
  version: string;
  /** Incremented when another editing visit takes over this finished session. */
  editPass: number;
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
  /**
   * The offer being written in the draft task and not sent yet. Only this tab keeps
   * it, so a reload brings the typed words back; the server gets the message once sent.
   */
  unsentDraft: string | null;
};

/** As kept in session storage, with the saves the server has not confirmed yet. */
export type StoredV3 = { progress: V3Progress; unsaved: string[] };

export const PILOT_KEY = "pilot";
const STORAGE_KEY = "takeover-study-v3";
const FINISHED_KEY = "takeover-study-finished";

export function loadV3(source: string): Resumed<StoredV3> {
  return resumeFromTab<StoredV3>(STORAGE_KEY, source, V3_VERSION);
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

/** Older wording versions kept only an ISO timestamp. Their answers cannot be reopened. */
export type FinishedStudy = { version: string; stored: StoredV3 | null };

export function finishedStudy(): FinishedStudy | null {
  const raw = deviceStorage()?.getItem(FINISHED_KEY);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw))
    return { version: "unknown", stored: null };
  const stored = JSON.parse(raw) as StoredV3;
  return { version: stored.progress.version, stored };
}

export function superseded(
  progress: V3Progress,
  finished: FinishedStudy | null,
) {
  const newer = finished?.stored?.progress;
  return (
    newer?.session === progress.session && newer.editPass > progress.editPass
  );
}

/** Other tabs need to stop offering the old editing pass when this session is reopened. */
export function watchFinished(listener: () => void) {
  const changed = (event: StorageEvent) => {
    if (event.key === FINISHED_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", changed);
  return () => window.removeEventListener("storage", changed);
}

export function storeV3(stored: StoredV3) {
  const { progress } = stored;
  try {
    tabStorage()?.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn("This tab could not keep the survey progress.", error);
  }
  if (
    !progress.events.some((event) => event.kind === "end") ||
    superseded(progress, finishedStudy())
  )
    return;
  // Only this tab needs a contact submission or unsent chat text. Neither belongs
  // in the device copy alongside the survey answers.
  const finished: StoredV3 = {
    progress: { ...progress, pilot: null, unsentDraft: null },
    unsaved: stored.unsaved.filter((key) => key !== PILOT_KEY),
  };
  try {
    deviceStorage()?.setItem(FINISHED_KEY, JSON.stringify(finished));
  } catch (error) {
    console.warn("This browser could not keep the finished answers.", error);
  }
}
