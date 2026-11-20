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
