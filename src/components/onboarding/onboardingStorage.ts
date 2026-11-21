import { restoreSavedValue } from "../../hooks/savedState.ts";
import { readRoute } from "../../navigation.ts";

/** Not account-scoped: finishing the intro as a guest still counts after signing in. */
const STORAGE_KEY = "takeover-onboarding";

/** Present once the visitor has finished or dismissed the intro. */
export type OnboardingRecord = {
  /** Search area picked in the intro, the default for accounts without one. */
  location?: string;
};
export type OnboardingMode = "open" | "invite" | "closed";

function isOnboardingRecord(value: unknown): value is OnboardingRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const { location } = value as Record<string, unknown>;
  return (
    location === undefined ||
    (typeof location === "string" &&
      location.trim().length > 0 &&
      location.length <= 120)
  );
}

export function readOnboarding(): OnboardingRecord | null {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked storage cannot remember the intro, so every visit is a first visit.
    return null;
  }
  // A damaged record also counts as a first visit and is replaced when the intro ends.
  return restoreSavedValue<OnboardingRecord | null>(
    stored,
    null,
    isOnboardingRecord,
  ).value;
}

/** Stores how the intro ended, keeping a search area remembered earlier. */
export function rememberOnboarding(update: OnboardingRecord) {
  const record: OnboardingRecord = { ...readOnboarding(), ...update };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    window.dispatchEvent(new CustomEvent("storage-failure"));
  }
}

/** First visits open the intro on phones and offer it on larger screens; deep links stay as they are. */
export function firstVisitMode(
  record: OnboardingRecord | null,
  onHome: boolean,
  phone: boolean,
): OnboardingMode {
  if (record || !onHome) return "closed";
  return phone ? "open" : "invite";
}

/** The intro's mode for the page as it is now opened. */
export function firstVisitModeHere(record: OnboardingRecord | null) {
  return firstVisitMode(
    record,
    readRoute(window.location.hash).view === "discover",
    window.matchMedia("(max-width: 760px)").matches,
  );
}
