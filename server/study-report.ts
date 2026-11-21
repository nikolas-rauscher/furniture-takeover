import { z } from "zod";
import {
  STUDY_PACK_PRICES,
  STUDY_PILOT_HOUSES,
  STUDY_PILOT_WEEKS,
  STUDY_REPORT_MIN_CELL,
  STUDY_V3_CORE_SCREENS,
  type StudyReport,
} from "../shared/study.ts";
import { AgentError } from "./errors.ts";

/** What a store hands over for the results page: v3 rows without session ids or emails. */
export const studyReportRowsSchema = z.strictObject({
  sessions: z.array(
    z.strictObject({
      version: z.string(),
      /** The UTC day the session started. */
      day: z.iso.date(),
      source: z.string(),
      /** Every screen shown at least once. */
      shown: z.array(z.string()),
      /** The screen shown last; null when no event arrived. */
      lastShown: z.string().nullable(),
      completed: z.boolean(),
      ended: z.boolean(),
    }),
  ),
  answers: z.array(
    z.strictObject({
      version: z.string(),
      step: z.string(),
      chosen: z.array(z.string()),
      text: z.string(),
    }),
  ),
  pilot: z.array(
    z.strictObject({
      house: z.enum(STUDY_PILOT_HOUSES),
      weeks: z.array(z.enum(STUDY_PILOT_WEEKS)),
      joinPilot: z.boolean(),
      laterEmail: z.boolean(),
    }),
  ),
});

export type StudyReportRows = z.infer<typeof studyReportRowsSchema>;
type Session = StudyReportRows["sessions"][number];
type Answer = StudyReportRows["answers"][number];

/** An offer sent as Pako drafted it is Pako's text, so only changed or own offers are listed. */
const isParticipantText = (answer: Answer) =>
  answer.text !== "" &&
  !(answer.step === "draft" && answer.chosen.includes("sent-unchanged"));

/** A count between 1 and the minimum is hidden, so a small group cannot be singled out. */
const shown = (count: number) =>
  count > 0 && count < STUDY_REPORT_MIN_CELL ? null : count;

function countBy<Item>(items: readonly Item[], keys: (item: Item) => string[]) {
  const counts = new Map<string, number>();
  for (const item of items)
    for (const key of keys(item)) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

function groupBy<Item>(items: readonly Item[], key: (item: Item) => string) {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

/** Largest count first, then by name, so equal counts keep a stable order. */
const byCount = (counts: Map<string, number>) =>
  [...counts].sort(([a, m], [b, n]) => n - m || a.localeCompare(b));

/** Versions with the newest session first; a later name wins a tie. */
function versionsOf(sessions: readonly Session[]) {
  const latest = new Map<string, string>();
  for (const { version, day } of sessions)
    if ((latest.get(version) ?? "") < day) latest.set(version, day);
  return [...latest]
    .sort(([a, x], [b, y]) => y.localeCompare(x) || b.localeCompare(a))
    .map(([version]) => version);
}

function days(sessions: readonly Session[], sources: string[]) {
  const byDay = groupBy(sessions, (session) => session.day);
  return [...byDay.keys()].sort().map((day) => {
    const started = byDay.get(day) ?? [];
    const perSource = countBy(started, (session) => [session.source]);
    return {
      day,
      total: shown(started.length),
      sources: sources.map((source) => ({
        source,
        count: shown(perSource.get(source) ?? 0),
      })),
    };
  });
}

/** Core screens first, in the survey's order; the rest after them by name. */
function screenOrder(step: string) {
  const index = STUDY_V3_CORE_SCREENS.findIndex((screen) => screen === step);
  return index === -1 ? STUDY_V3_CORE_SCREENS.length : index;
}
const inSurveyOrder = (a: string, b: string) =>
  screenOrder(a) - screenOrder(b) || a.localeCompare(b);

function questions(answers: readonly Answer[]) {
  const answered = answers.filter((answer) => answer.chosen.length > 0);
  const bySteps = groupBy(answered, (answer) => answer.step);
  return [...bySteps.keys()].sort(inSurveyOrder).map((step) => {
    const rows = bySteps.get(step) ?? [];
    return {
      step,
      answered: shown(rows.length),
      options: byCount(countBy(rows, (row) => row.chosen)).map(
        ([option, count]) => ({ option, count: shown(count) }),
      ),
    };
  });
}

function texts(answers: readonly Answer[]) {
  const typed = answers.filter(isParticipantText);
  const bySteps = groupBy(typed, (answer) => answer.step);
  return [...bySteps.keys()].sort(inSurveyOrder).map((step) => ({
    step,
    texts: (bySteps.get(step) ?? [])
      .map((answer) => answer.text)
      .sort((a, b) => a.localeCompare(b)),
  }));
}

/** Each pack price: the sessions shown it, answered or not, and the yes answers there. */
function ladder(sessions: readonly Session[], answers: readonly Answer[]) {
  return STUDY_PACK_PRICES.map((price) => {
    const step = `pack-chf-${price}`;
    return {
      price,
      shown: shown(
        sessions.filter((session) => session.shown.includes(step)).length,
      ),
      yes: shown(
        answers.filter(
          (answer) => answer.step === step && answer.chosen.includes("yes"),
        ).length,
      ),
    };
  });
}

function pilot(forms: StudyReportRows["pilot"]) {
  return {
    forms: forms.length,
    joinPilot: forms.filter((form) => form.joinPilot).length,
    laterEmail: forms.filter((form) => form.laterEmail).length,
    houses: STUDY_PILOT_HOUSES.map((house) => {
      const signUps = forms.filter(
        (form) => form.house === house && form.joinPilot,
      );
      const perWeek = countBy(signUps, (form) => form.weeks);
      return {
        house,
        total: shown(signUps.length),
        weeks: STUDY_PILOT_WEEKS.map((week) => ({
          week,
          count: shown(perWeek.get(week) ?? 0),
        })),
      };
    }),
  };
}

/**
 * The results page for one wording version, the newest when none is asked for.
 * Only counts and alphabetically sorted texts leave this function.
 */
export function buildStudyReport(
  rows: StudyReportRows,
  wanted: string | null,
): StudyReport {
  const versions = versionsOf(rows.sessions);
  if (wanted !== null && !versions.includes(wanted))
    throw new AgentError(
      404,
      "STUDY_VERSION_UNKNOWN",
      "No v3 session has this wording version.",
    );
  const version = wanted ?? versions[0] ?? null;
  const sessions = rows.sessions.filter(
    (session) => session.version === version,
  );
  const answers = rows.answers.filter((answer) => answer.version === version);
  const sources = byCount(countBy(sessions, (session) => [session.source])).map(
    ([source]) => source,
  );
  const reached = countBy(sessions, (session) => session.shown);
  const left = countBy(
    sessions.filter((session) => !session.completed),
    (session) => (session.lastShown === null ? [] : [session.lastShown]),
  );
  return {
    versions,
    version,
    minCell: STUDY_REPORT_MIN_CELL,
    totals: {
      started: sessions.length,
      completed: sessions.filter((session) => session.completed).length,
      ended: sessions.filter((session) => session.ended).length,
    },
    sources,
    days: days(sessions, sources),
    funnel: STUDY_V3_CORE_SCREENS.map((step) => ({
      step,
      reached: shown(reached.get(step) ?? 0),
    })),
    dropOff: byCount(left).map(([step, count]) => ({
      step,
      count: shown(count),
    })),
    questions: questions(answers),
    texts: texts(answers),
    ladder: ladder(sessions, answers),
    pilot: pilot(rows.pilot),
  };
}
