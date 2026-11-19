import { HOUR_MS } from "./config.ts";

const zone = "Europe/Zurich";
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const deadlineFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: zone,
});
const calendarDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: zone,
});

/** "Thu 23 Oct, 14:30" in Lausanne time. */
export const formatDeadline = (iso: string) =>
  deadlineFormat.format(new Date(iso));

/** "Thu 23 Oct" for a YYYY-MM-DD day. */
export const formatDay = (day: string) =>
  dayFormat.format(new Date(`${day}T12:00:00Z`));

/** "23h 12m", "45m"; never negative. */
export function formatTimeLeft(until: string, now: Date) {
  const minutes = Math.max(
    0,
    Math.ceil((Date.parse(until) - now.getTime()) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** Today, tomorrow and the day after, as YYYY-MM-DD in Lausanne. */
export function pickupDays(now: Date) {
  const today = calendarDay.format(now);
  const anchor = Date.parse(`${today}T12:00:00Z`);
  return [0, 1, 2].map((offset) => {
    const day = new Date(anchor + offset * 24 * HOUR_MS)
      .toISOString()
      .slice(0, 10);
    return {
      day,
      label:
        offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : formatDay(day),
    };
  });
}

/** The one buyer message a reservation request posts in the thread. */
export const reservationRequestMessage = (day: string) =>
  `I'd like to reserve this. Can I pick it up by ${formatDay(day)}?`;
