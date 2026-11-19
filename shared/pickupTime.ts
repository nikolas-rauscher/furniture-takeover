/**
 * Pickup times in the students' own words ("Thursday at 18:00", "demain 18h",
 * "20.11. 18 Uhr"), resolved to an exact instant in Zurich time. Pure: every
 * caller passes `now`, so the server and tests agree on the same clock.
 */

const ZONE = "Europe/Zurich";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** A pickup closer than this is too soon to plan. */
const EARLIEST_AHEAD_MS = 30 * MINUTE;
/** A pickup further away than this is too far to plan. */
const LATEST_AHEAD_MS = 60 * DAY;
/** A weekday without a date means today only while its time is this far ahead. */
const SAME_DAY_AHEAD_MS = 60 * MINUTE;

type LocalDate = { year: number; month: number; day: number };
type LocalTime = { hour: number; minute: number };
type WallClock = LocalDate & LocalTime;
/** A date as written: the year may be left out. */
type WrittenDate = Omit<LocalDate, "year"> & { year?: number };

const zurichClock = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

function wallClock(instant: number): WallClock {
  const parts = Object.fromEntries(
    zurichClock.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** How far Zurich's clocks are ahead of UTC at an instant on a full minute. */
function offsetAt(instant: number): number {
  const local = wallClock(instant);
  return (
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) -
    instant
  );
}

const sameDate = (a: LocalDate, b: LocalDate) =>
  a.year === b.year && a.month === b.month && a.day === b.day;

/**
 * The instant a Zurich wall-clock time names. The offsets half a day before and
 * after cover both sides of a clock change: a time the clocks skip in spring has
 * no instant, and a time they repeat in autumn takes the earlier one.
 */
function zurichInstant(date: LocalDate, time: LocalTime): number | null {
  const naive = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    time.hour,
    time.minute,
  );
  const matching = [naive - 12 * HOUR, naive + 12 * HOUR]
    .map((probe) => naive - offsetAt(probe))
    .filter((instant) => {
      const clock = wallClock(instant);
      return (
        sameDate(clock, date) &&
        clock.hour === time.hour &&
        clock.minute === time.minute
      );
    });
  return matching.length ? Math.min(...matching) : null;
}

const isCalendarDate = ({ year, month, day }: LocalDate) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

function addDays(date: LocalDate, days: number): LocalDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

const weekdayOf = ({ year, month, day }: LocalDate) =>
  new Date(Date.UTC(year, month - 1, day)).getUTCDay();

/** Lower case without accents, so "März" and "août" read as "marz" and "aout". */
const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’`]/g, "'")
    .toLowerCase();

/** Words that turn a time into a window ("after 17:00", "ab 18 Uhr"), which names no instant. */
const WINDOW =
  /\b(?:after|before|between|from|until|till|by|latest|earliest|apres(?!-demain)|avant|entre|jusqu|partir|ab|nach|vor|bis|zwischen|spatestens|fruhestens)\b/;

/** Month names in English, French and German, recognised by their first letters. */
const MONTH_PREFIXES: readonly (readonly [string, number])[] = [
  ["jan", 1],
  ["feb", 2],
  ["fev", 2],
  ["mar", 3],
  ["apr", 4],
  ["avr", 4],
  ["may", 5],
  ["mai", 5],
  ["juin", 6],
  ["jun", 6],
  ["juil", 7],
  ["jul", 7],
  ["aug", 8],
  ["aou", 8],
  ["sep", 9],
  ["oct", 10],
  ["okt", 10],
  ["nov", 11],
  ["dec", 12],
  ["dez", 12],
];

const monthNumber = (word: string) =>
  MONTH_PREFIXES.find(([prefix]) => word.startsWith(prefix))?.[1];

/** Long weekday names, English short forms, and French or German short forms with their dot. */
const WEEKDAYS: readonly (readonly [RegExp, number])[] = [
  [/\b(?:sunday|sun|dimanche|sonntag)\b|\b(?:dim|so)\./, 0],
  [/\b(?:monday|mon|lundi|montag)\b|\b(?:lun|mo)\./, 1],
  [/\b(?:tuesday|tues?|mardi|dienstag)\b|\b(?:mar|di)\./, 2],
  [/\b(?:wednesday|wed|mercredi|mittwoch)\b|\b(?:mer|mi)\./, 3],
  [/\b(?:thursday|thu|thur|thurs|jeudi|donnerstag)\b|\b(?:jeu|do)\./, 4],
  [/\b(?:friday|fri|vendredi|freitag)\b|\b(?:ven|fr)\./, 5],
  [/\b(?:saturday|sat|samedi|samstag)\b|\b(?:sam|sa)\./, 6],
];

/** Blanks a matched part of the words, so later patterns cannot read it again. */
const blank = (text: string, match: RegExpMatchArray) =>
  text.slice(0, match.index) +
  " ".repeat(match[0].length) +
  text.slice(match.index! + match[0].length);

const validDayAndMonth = (date: WrittenDate) =>
  date.month >= 1 && date.month <= 12 && date.day >= 1 && date.day <= 31;

/** "2026-11-20", "20/11", "20.11." (with its dot), or "20 Nov", "20 novembre", "20. November". */
const DATE_PATTERNS: readonly (readonly [
  RegExp,
  (match: RegExpMatchArray) => WrittenDate | undefined,
])[] = [
  [
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    ([, year, month, day]) => ({
      year: Number(year),
      month: Number(month),
      day: Number(day),
    }),
  ],
  [
    /\b(\d{1,2})(?:\/(\d{1,2})(?:\/(\d{4}|\d{2}))?\b|\.(\d{1,2})\.(\d{4}|\d{2})?(?!\d))/g,
    ([, day, slashMonth, slashYear, dotMonth, dotYear]) => {
      const year = slashYear ?? dotYear;
      return {
        day: Number(day),
        month: Number(slashMonth ?? dotMonth),
        ...(year ? { year: Number(year.padStart(4, "20")) } : {}),
      };
    },
  ],
  [
    /\b(\d{1,2})\.?\s*([a-z]{3,})\.?/g,
    ([, day, word]) => {
      const month = monthNumber(word);
      return month ? { day: Number(day), month } : undefined;
    },
  ],
];

function writtenDate(text: string): { date?: WrittenDate; rest: string } {
  for (const [pattern, read] of DATE_PATTERNS)
    for (const match of text.matchAll(pattern)) {
      const date = read(match);
      if (date && validDayAndMonth(date))
        return { date, rest: blank(text, match) };
    }
  return { rest: text };
}

/** Days from today: "today", "tomorrow", "the day after tomorrow", in English, French and German. */
function relativeDay(text: string): number | undefined {
  if (/(?:\bday after tomorrow|\bapres-demain|\bubermorgen)\b/.test(text))
    return 2;
  if (/\b(?:today|tonight|aujourd'?hui|ce soir|heute)\b/.test(text)) return 0;
  if (/\b(?:tomorrow|demain|morgen)\b/.test(text)) return 1;
  return undefined;
}

/** The one weekday the words name; naming two names none. */
function weekday(text: string): number | undefined {
  const named = WEEKDAYS.filter(([pattern]) => pattern.test(text));
  return named.length === 1 ? named[0][1] : undefined;
}

/** Clock times in the students' notations, most specific first. */
const TIME_PATTERNS: readonly (readonly [
  RegExp,
  (match: RegExpMatchArray) => LocalTime,
])[] = [
  [
    /\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/g,
    (match) => ({
      hour: (Number(match[1]) % 12) + (match[3] === "pm" ? 12 : 0),
      minute: Number(match[2] ?? 0),
    }),
  ],
  [
    /\b(\d{1,2})(?:[:.](\d{2}))?\s?uhr\b/g,
    (match) => ({ hour: Number(match[1]), minute: Number(match[2] ?? 0) }),
  ],
  [
    /\b(\d{1,2})\s?h(?:\s?(\d{2}))?\b/g,
    (match) => ({ hour: Number(match[1]), minute: Number(match[2] ?? 0) }),
  ],
  [
    /\b(\d{1,2})[:.](\d{2})\b/g,
    (match) => ({ hour: Number(match[1]), minute: Number(match[2]) }),
  ],
];

/** The one time of day the words name; two different times, or none, name no instant. */
function timeOfDay(text: string): LocalTime | null {
  const times: LocalTime[] = [];
  let rest = text;
  for (const [pattern, read] of TIME_PATTERNS) {
    for (const match of rest.matchAll(pattern)) times.push(read(match));
    rest = rest.replace(pattern, (found) => " ".repeat(found.length));
  }
  if (new Set(times.map(({ hour, minute }) => hour * 60 + minute)).size !== 1)
    return null;
  const [time] = times;
  return time.hour <= 23 && time.minute <= 59 ? time : null;
}

/** A written date's day; without a year it is the date's next occurrence. */
function datedDay(
  written: WrittenDate,
  today: LocalDate,
  time: LocalTime,
  now: Date,
): LocalDate | null {
  if (written.year !== undefined) {
    const date = { ...written, year: written.year };
    return isCalendarDate(date) ? date : null;
  }
  const thisYear = { ...written, year: today.year };
  const instant = isCalendarDate(thisYear)
    ? zurichInstant(thisYear, time)
    : null;
  const date =
    instant !== null && instant >= now.getTime()
      ? thisYear
      : { ...written, year: today.year + 1 };
  return isCalendarDate(date) ? date : null;
}

/** A weekday's next occurrence: today only while the time is at least an hour ahead. */
function upcomingWeekday(
  today: LocalDate,
  wanted: number,
  time: LocalTime,
  now: Date,
): LocalDate {
  const date = addDays(today, (wanted - weekdayOf(today) + 7) % 7);
  if (!sameDate(date, today)) return date;
  const instant = zurichInstant(date, time);
  return instant !== null && instant - now.getTime() >= SAME_DAY_AHEAD_MS
    ? date
    : addDays(date, 7);
}

/** The day the words name: a date, a day from today or a weekday; days that contradict each other name none. */
function pickupDay(
  written: WrittenDate | undefined,
  rest: string,
  time: LocalTime,
  now: Date,
): LocalDate | null {
  const today = wallClock(now.getTime());
  const named = weekday(rest);
  const relative = relativeDay(rest);
  const fromDate = written ? datedDay(written, today, time, now) : undefined;
  if (fromDate === null) return null;
  const fromToday =
    relative === undefined ? undefined : addDays(today, relative);
  if (fromDate && fromToday && !sameDate(fromDate, fromToday)) return null;
  const day =
    fromDate ??
    fromToday ??
    (named === undefined
      ? undefined
      : upcomingWeekday(today, named, time, now));
  if (!day || (named !== undefined && weekdayOf(day) !== named)) return null;
  return day;
}

/**
 * The exact instant a pickup's words name, or null. The words need a day and a
 * time: a weekday means its next occurrence (today only while at least an hour
 * ahead), and a date without a year its next occurrence. Windows such as "after
 * 17:00" or "evenings" name no instant. The result lies between 30 minutes and
 * 60 days ahead of `now`.
 */
export function resolvePickupAt(words: string, now: Date): string | null {
  const text = plain(words);
  if (WINDOW.test(text)) return null;
  const { date: written, rest } = writtenDate(text);
  const time = timeOfDay(rest);
  if (!time) return null;
  const day = pickupDay(written, rest, time, now);
  const instant = day ? zurichInstant(day, time) : null;
  if (instant === null) return null;
  const ahead = instant - now.getTime();
  return ahead >= EARLIEST_AHEAD_MS && ahead <= LATEST_AHEAD_MS
    ? new Date(instant).toISOString()
    : null;
}

/** "18:00": the Zurich clock time of an instant, as every pickup message states it. */
export function zurichClockTime(iso: string): string {
  const { hour, minute } = wallClock(Date.parse(iso));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatPickup(iso: string, locale = "en-GB"): string {
  const day = new Intl.DateTimeFormat(locale, {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
  return day + ", " + zurichClockTime(iso);
}

function slotWindow(text: string, day: number, offset: number): number[] {
  if (/^(?:flexible(?: pickup)?|pickup by .*)?$/.test(text))
    return [
      ...(offset === 1 || offset === 2 ? [1080] : []),
      ...(day === 6 && offset < 7 ? [660] : []),
      ...(text.startsWith("pickup by ") && offset === 0 ? [1080] : []),
    ];
  if (/^weekends?(?: pickup)?$/.test(text))
    return day === 0 || day === 6 ? [660, 900] : [];
  if (/^(?:lunchtime,? )?(?:mon-fri|weekdays?)$/.test(text))
    return day >= 1 && day <= 5 ? [720, 750] : [];
  const window = text.match(/^([a-z]+)(?: evenings?)?(?: after (\d{1,2}):(\d{2})| (\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2}))?$/);
  if (!window) return [];
  const [, days, afterHour, afterMinute, startHour, startMinute, endHour, endMinute] = window;
  const named = weekday(days);
  if (days === "weekday" || days === "weekdays") {
    if (day < 1 || day > 5) return [];
  } else if (named !== day) return [];
  if (startHour) {
    const start = Number(startHour) * 60 + Number(startMinute);
    const end = Number(endHour) * 60 + Number(endMinute);
    if (start > end) return [];
    const times: number[] = [];
    for (let time = start; time < end; time += 60) times.push(time);
    return [...times, end];
  }
  const after = afterHour ? Number(afterHour) * 60 + Number(afterMinute) + 30 : 1080;
  return [after, after + 60];
}

function availabilityDeadline(words: string, today: LocalDate): number | null {
  const { date } = writtenDate(words);
  if (!date) return null;
  const day = { ...date, year: date.year ?? today.year };
  // A December listing can specify January without writing the year.
  if (!date.year && today.month === 12 && date.month === 1) day.year++;
  return isCalendarDate(day) ? zurichInstant(day, { hour: 23, minute: 59 }) : null;
}

export function pickupSlots(available: string, now: Date, pickupBy?: string) {
  const today = wallClock(now.getTime());
  const text = plain(available).trim();
  const statedDeadline = /\bby\b/.test(text) ? availabilityDeadline(text, today) : null;
  const listingDeadline = pickupBy ? availabilityDeadline(pickupBy, today) : null;
  if (/\bby\b/.test(text) && statedDeadline === null) return [];
  const windows = statedDeadline === null || text.startsWith("pickup by ")
    ? text
    : text.replace(/[,;]?\s+(?:pickup )?by\b.*$/, "").trim();
  const deadline = Math.min(statedDeadline ?? Infinity, listingDeadline ?? Infinity);
  const instants = new Set<number>();
  for (let offset = 0; offset <= 8 && instants.size < 4; offset++) {
    const date = addDays(today, offset);
    for (const minutes of slotWindow(windows, weekdayOf(date), offset)) {
      if (minutes >= 1440) continue;
      const instant = zurichInstant(date, {
        hour: Math.floor(minutes / 60),
        minute: minutes % 60,
      });
      if (instant !== null && instant <= deadline && instant - now.getTime() >= EARLIEST_AHEAD_MS)
        instants.add(instant);
    }
    if (weekday(windows) !== undefined && !windows.includes("mon-fri") && instants.size) break;
  }
  return [...instants]
    .sort((a, b) => a - b)
    .slice(0, 4)
    .map((t) => {
      const pickupAt = new Date(t).toISOString();
      return { pickupAt, pickupTime: formatPickup(pickupAt) };
    });
}
