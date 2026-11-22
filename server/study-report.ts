import { z } from "zod";
import {
  STUDY_PACK_PRICES,
  STUDY_PACK_START,
  STUDY_PILOT_PLACES,
  STUDY_BUYING_ROLES,
  STUDY_PILOT_ROLES,
  STUDY_SELLING_ROLES,
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
      launchNews: z.boolean(),
      tryEarly: z.boolean(),
      interview: z.boolean(),
      futureSurveys: z.boolean(),
      roles: z.array(z.enum(STUDY_PILOT_ROLES)),
      place: z.enum(STUDY_PILOT_PLACES).nullable(),
      /** Null for forms from before v4, which did not store it. */
      version: z.string().nullable(),
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

function coreScreens(version: string | null): readonly string[] {
  if (version !== "v4-2") return STUDY_V3_CORE_SCREENS;
  return STUDY_V3_CORE_SCREENS.filter(
    (step) => step !== "max-distance",
  ).flatMap((step) => {
    if (step === "app-deal") return [step, "max-distance"];
    if (step === "pay-model") return [step, "pay-model-not"];
    return [step];
  });
}

/** Core screens first, in the survey's order; the rest after them by name. */
function screenOrder(step: string) {
  const index = STUDY_V3_CORE_SCREENS.findIndex((screen) => screen === step);
  return index === -1 ? STUDY_V3_CORE_SCREENS.length : index;
}
const inSurveyOrder = (a: string, b: string) =>
  screenOrder(a) - screenOrder(b) || a.localeCompare(b);

/** A full pricing ranking has one count per position. Earlier single-pick versions retain ordinary counts. */
function optionCounts(step: string, rows: Answer[]) {
  const ranked =
    step === "pay-model" && rows.some((row) => row.chosen.length > 1);
  if (!ranked)
    return byCount(countBy(rows, (row) => row.chosen)).map(
      ([option, count]) => ({ option, count: shown(count) }),
    );
  return Array.from(
    { length: Math.max(...rows.map((row) => row.chosen.length)) },
    (_, index) =>
      byCount(countBy(rows, (row) => row.chosen.slice(index, index + 1))).map(
        ([option, count]) => ({ option, rank: index + 1, count: shown(count) }),
      ),
  ).flat();
}

function questions(answers: readonly Answer[]) {
  const answered = answers.filter((answer) => answer.chosen.length > 0);
  const bySteps = groupBy(answered, (answer) => answer.step);
  return [...bySteps.keys()].sort(inSurveyOrder).map((step) => {
    const rows = bySteps.get(step) ?? [];
    return {
      step,
      answered: shown(rows.length),
      options: optionCounts(step, rows),
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

const yesAt = (answers: readonly Answer[], price: number) =>
  answers.filter(
    (answer) =>
      answer.step === `pack-chf-${price}` && answer.chosen.includes("yes"),
  ).length;

/**
 * The pack ladder over everyone shown its first price, answered or not. A lower price
 * is asked only after "no" at the first, so yes at the first price adds to the yes
 * answers there without linking sessions. Yes at a higher price was yes at the first.
 */
function ladder(sessions: readonly Session[], answers: readonly Answer[]) {
  const entered = sessions.filter((session) =>
    session.shown.includes(`pack-chf-${STUDY_PACK_START}`),
  ).length;
  return {
    entered: shown(entered),
    prices: STUDY_PACK_PRICES.map((price) => ({
      price,
      yes: shown(
        yesAt(answers, price) +
          (price < STUDY_PACK_START ? yesAt(answers, STUDY_PACK_START) : 0),
      ),
    })),
  };
}

function pilot(forms: StudyReportRows["pilot"]) {
  const early = forms.filter((form) => form.tryEarly);
  return {
    forms: forms.length,
    launchNews: forms.filter((form) => form.launchNews).length,
    tryEarly: early.length,
    interview: forms.filter((form) => form.interview).length,
    futureSurveys: forms.filter((form) => form.futureSurveys).length,
    places: STUDY_PILOT_PLACES.map((place) => {
      const here = early.filter((form) => form.place === place);
      const naming = (roles: readonly string[]) =>
        shown(
          here.filter((form) => form.roles.some((role) => roles.includes(role)))
            .length,
        );
      return {
        place,
        sellers: naming(STUDY_SELLING_ROLES),
        buyers: naming(STUDY_BUYING_ROLES),
        undecided: naming(["not-sure"]),
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
    funnel: coreScreens(version).map((step) => ({
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
    pilot: pilot(rows.pilot.filter((form) => form.version === version)),
  };
}
