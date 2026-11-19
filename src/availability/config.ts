/** Reserve & confirm prototype durations. Change them here only. */
export const SELLER_REPLY_HOURS = 24;
export const HOLD_HOURS = 48;
export const WAITLIST_PRIORITY_HOURS = 12;

export const HOUR_MS = 60 * 60 * 1000;

/** Both rules below are prototype choices, not decided behaviour; the app says so where they apply. */
export const OPEN_QUESTIONS = `Prototype: "It's gone" marks the item sold, and a listing without a reply within ${SELLER_REPLY_HOURS} h is hidden. Both are still open product questions.`;
