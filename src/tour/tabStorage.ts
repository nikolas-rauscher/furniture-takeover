/**
 * Session storage is missing in some private windows. The tour still runs there; only
 * what it keeps for the tab, such as the survey's progress, is lost on a reload, so the
 * problem is reported and not thrown.
 */
export function tabStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn(
      "Session storage is unavailable; a reload starts the tour again.",
      error,
    );
    return null;
  }
}

/** Progress kept for the tab: where a participant was, from which link and wording. */
type KeptProgress = { progress: { source: string; version: string } };

/** What a reload finds: progress to continue, and whether an earlier wording's was set aside. */
export type Resumed<Kept> = { stored: Kept | null; updated: boolean };

/**
 * The progress kept under `key`, to continue after a reload: only from the same link and
 * only in the same wording version, so a session never runs across two versions. Progress
 * of another version is set aside for a new session to replace, and `updated` says so.
 */
export function resumeFromTab<Kept extends KeptProgress>(
  key: string,
  source: string,
  version: string,
): Resumed<Kept> {
  const raw = tabStorage()?.getItem(key);
  if (!raw) return { stored: null, updated: false };
  const kept = JSON.parse(raw) as Kept;
  // A link from another channel starts a session of its own.
  if (kept.progress.source !== source) return { stored: null, updated: false };
  if (kept.progress.version !== version) return { stored: null, updated: true };
  return { stored: kept, updated: false };
}
