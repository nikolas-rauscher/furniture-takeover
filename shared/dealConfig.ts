/** Timers and limits for conversations between students. Change them here only. */

/** A message of mine that has had no answer for this long offers a nudge. */
export const NUDGE_AFTER_HOURS = 24;

/** With accounts, Pako reads replies by himself only while this many reads are left today. */
export const AUTO_READ_MIN_REMAINING = 6;

/** Pako reads at most this many of the newest messages of a thread… */
export const THREAD_TURN_MESSAGES = 20;
/** …and at most this many characters of them. */
export const THREAD_TURN_CHARS = 8_000;
