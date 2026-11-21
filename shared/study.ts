import { z } from "zod";

/**
 * Wire contract of the user study on the tour page. The questions live in the client's
 * script; the server only checks the shape of what it stores. Two questionnaires run side
 * by side: v1 (docs/STUDY-v1.md) and v3 (docs/STUDY.md).
 */

export const STUDY_ROUTES = {
  config: "/api/study/config",
  sessions: "/api/study/sessions",
  answers: "/api/study/answers",
  events: "/api/study/events",
  contacts: "/api/study/contacts",
  pilot: "/api/study/pilot",
  withdrawals: "/api/study/withdrawals",
  results: "/api/study/results",
  /** Admins only: the counts of the results page. */
  report: "/api/study/report",
} as const;

export const STUDY_SURVEYS = ["v1", "v3"] as const;
export const STUDY_LANGUAGES = ["en", "fr", "de"] as const;
export const STUDY_TEXT_MAX = 280;
export const STUDY_EVENTS_PER_BATCH = 40;
/** The server keeps at most this many events per session, so the client sends no more. */
export const STUDY_EVENTS_PER_SESSION = 600;
/**
 * "How others answered" appears once this many v3 participants of the same wording version
 * answered the desk task.
 */
export const STUDY_RESULTS_MINIMUM = 20;
/** The two v3 steps whose counts are shown to later participants. */
export const STUDY_RESULT_STEPS = {
  desk: "desk",
  trouble: "last-trouble",
} as const;

const MAX_OPTIONS = 12;
const MAX_STEP_MS = 60 * 60 * 1000;
const MAX_REVISION = 100_000;
const MAX_EVENT_SEQ = 9_999;

const session = z.uuid();
const stepId = z.string().regex(/^[a-z][a-z0-9-]{1,39}$/);
const optionId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);
const optionIds = z.array(optionId).max(MAX_OPTIONS);
const uniqueList = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .array(z.enum(values))
    .max(values.length)
    .refine((list) => new Set(list).size === list.length, "Listed twice.");

const studySurveySchema = z.enum(STUDY_SURVEYS);
const studyLanguageSchema = z.enum(STUDY_LANGUAGES);
/** Changes with the questions or their wording, so answers to different wordings stay apart. */
export const studyVersionSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.-]{0,19}$/);

/** The study is open once the deployment names a contact and a deletion date. */
export const studyConfigSchema = z.discriminatedUnion("open", [
  z.strictObject({ open: z.literal(false) }),
  z.strictObject({
    open: z.literal(true),
    contact: z.email(),
    deleteBy: z.iso.date(),
  }),
]);

export const studyStartSchema = z
  .strictObject({
    session,
    /** Which questionnaire the participant answers. The v1 client predates the field. */
    survey: studySurveySchema.optional(),
    /** The wording version, so pilot answers can be told apart. */
    version: studyVersionSchema,
    /** Page language when the session started; a later switch is recorded as an event. */
    language: studyLanguageSchema.optional(),
    /** Channel tag from the invitation link. */
    source: z.string().regex(/^[a-z0-9][a-z0-9-]{0,23}$/),
    device: z.enum(["phone", "desktop"]),
    /** A session only exists once the participant agreed. */
    consent: z.literal(true),
  })
  .refine((start) => start.survey !== "v3" || start.language !== undefined, {
    path: ["language"],
    message: "A v3 session names its language.",
  });

/** A start request without `survey` comes from the v1 client, which has no other form. */
export const surveyOf = (start: StudyStart): StudySurvey =>
  start.survey ?? "v1";

export const studyAnswerSchema = z.strictObject({
  session,
  step: stepId,
  /** Chosen options, in the order they were tapped. */
  chosen: optionIds,
  /**
   * v3 only, required there: the options of the first answer to this step. The server
   * keeps the value it received first, so going back cannot change it. v1 sends none.
   */
  firstChosen: optionIds.optional(),
  /** Options in the order shown, for steps that shuffle them; empty otherwise. */
  shown: optionIds,
  /** Free text, empty when the step has none or it was left blank. */
  text: z.string().trim().max(STUDY_TEXT_MAX),
  /** How long the step was on screen. */
  elapsedMs: z.number().int().min(0).max(MAX_STEP_MS),
  /**
   * v3 only: raised by the client with every save of this answer. The server keeps the
   * newest; an older write, such as one still in flight from before a reload, changes nothing.
   */
  revision: z.number().int().min(1).max(MAX_REVISION).optional(),
});

/**
 * What an event records, with the meaning of `step` and `detail`:
 * - `shown`, `answered`, `skipped`, `changed`: step = the question.
 * - `back`: step = the step left, detail = the step returned to.
 * - `scene-played`, `scene-skipped`: step = the tour step, detail = the scene.
 * - `moment-tapped`, `moment-auto`: a key moment of a scene was tapped or advanced by
 *   itself, on the scene's first play; step = the tour step, detail = the moment.
 * - `core-complete`, `end`: no step, no detail.
 * - `share`: detail = `native`, `copy` or `qr`.
 * - `language`: detail = the language switched to.
 */
export const STUDY_EVENT_KINDS = [
  "shown",
  "answered",
  "skipped",
  "changed",
  "back",
  "scene-played",
  "scene-skipped",
  "moment-tapped",
  "moment-auto",
  "core-complete",
  "end",
  "share",
  "language",
] as const;

const studyEventSchema = z.strictObject({
  /** Position of the event in the session, from 0. A resent event is stored once. */
  seq: z.number().int().min(0).max(MAX_EVENT_SEQ),
  kind: z.enum(STUDY_EVENT_KINDS),
  step: stepId.nullable(),
  detail: optionId.nullable(),
  /** Device time when it happened. */
  at: z.iso.datetime(),
});

export const studyEventsSchema = z.strictObject({
  session,
  events: z.array(studyEventSchema).min(1).max(STUDY_EVENTS_PER_BATCH),
});

/** v1 only: the optional email at the end, linked to the answers only on request. */
export const studyContactSchema = z.strictObject({
  email: z.email().max(254),
  /** Wants an invitation to the test with real items, not only follow-up questions. */
  pilot: z.boolean(),
  /** Set only when the participant agreed to link the address to their answers. */
  session: session.nullable(),
});

export const STUDY_PILOT_ROLES = ["seller", "buyer", "both"] as const;
export const STUDY_PILOT_HOUSES = [
  "vortex",
  "atrium",
  "triaudes",
  "fmel-other",
  "not-fmel",
] as const;
/** Monday of each offered week. */
export const STUDY_PILOT_WEEKS = [
  "2026-12-14",
  "2026-12-21",
  "2027-02-01",
  "2027-02-08",
] as const;
/** The same categories as the v3 question `last-item`. */
export const STUDY_PILOT_ITEMS = [
  "furniture",
  "household",
  "electronics",
  "bike",
  "books",
  "clothes",
  "other",
] as const;

/** v3 pilot form. Stored without a session, so it cannot be linked to answers. */
export const studyPilotSchema = z
  .strictObject({
    email: z.email().max(254),
    role: z.enum(STUDY_PILOT_ROLES),
    house: z.enum(STUDY_PILOT_HOUSES),
    weeks: uniqueList(STUDY_PILOT_WEEKS),
    items: uniqueList(STUDY_PILOT_ITEMS),
    /** "Sign me up for the pilot in these weeks". */
    joinPilot: z.boolean(),
    /** "Email me about later tests or two or three follow-up questions". */
    laterEmail: z.boolean(),
  })
  .refine(
    (form) => form.joinPilot || form.laterEmail,
    "Tick at least one of the two boxes.",
  );

/** Removes the session with its answers and events. Removing it twice changes nothing. */
export const studyWithdrawalSchema = z.strictObject({ session });

const tallySchema = z.strictObject({
  /** Participants who answered the step. */
  answered: z.number().int().min(0),
  options: z.array(
    z.strictObject({ option: optionId, count: z.number().int().min(1) }),
  ),
});

/** Counts over the v3 sessions of one wording version, shown at the end of the survey. */
export const studyResultsSchema = z.discriminatedUnion("ready", [
  z.strictObject({ ready: z.literal(false) }),
  z.strictObject({
    ready: z.literal(true),
    desk: tallySchema,
    trouble: tallySchema,
  }),
]);

/**
 * The v3 core screens in their order, conditional ones included. The results page reads
 * its funnel along this list; the client's script test keeps the two in step.
 */
export const STUDY_V3_CORE_SCREENS = [
  "what-is",
  "who",
  "last-role",
  "last-item",
  "last-occasion",
  "last-story",
  "last-trouble",
  "last-cost",
  "why-not",
  "move",
  "housing",
  "headline",
  "app-find",
  "helped-find",
  "app-sell",
  "helped-sell",
  "app-deal",
  "helped-deal",
  "stop",
  "try-first",
  "sending",
  "wanted-react",
  "wanted-share",
  "move-it",
  "desk",
  "draft",
  "pay-model",
  "pack-price",
  "delivery-pref",
  "delivery-worth",
] as const;

/** The move-out pack's prices in CHF on the survey's price ladder, from low to high. */
export const STUDY_PACK_PRICES = [2, 5, 8] as const;

/** On the results page, a breakdown cell with fewer answers than this is hidden. */
export const STUDY_REPORT_MIN_CELL = 5;

const count = z.number().int().min(0);
/** A breakdown count; null when it lies between 1 and the minimum, so it stays hidden. */
const cell = count.nullable();

/** Aggregates of one v3 wording version for the admin results page; nothing per person. */
export const studyReportSchema = z.strictObject({
  /** Every v3 wording version with sessions, newest first. */
  versions: z.array(z.string()),
  /** The version counted below; null before the first v3 session. */
  version: z.string().nullable(),
  minCell: z.number().int().min(1),
  totals: z.strictObject({ started: count, completed: count, ended: count }),
  /** The channels with sessions, in the order the day rows list them. */
  sources: z.array(z.string()),
  /** Sessions started per UTC day, in total and per channel. */
  days: z.array(
    z.strictObject({
      day: z.iso.date(),
      total: cell,
      sources: z.array(z.strictObject({ source: z.string(), count: cell })),
    }),
  ),
  /** Sessions that were shown each core screen, in the order of the survey. */
  funnel: z.array(z.strictObject({ step: stepId, reached: cell })),
  /** Sessions that left before the core was saved, by the last screen they saw. */
  dropOff: z.array(z.strictObject({ step: stepId, count: cell })),
  /**
   * Counts per option; `answered` is the denominator, skips excluded. A denominator
   * is a breakdown too, so it is hidden like the counts.
   */
  questions: z.array(
    z.strictObject({
      step: stepId,
      answered: cell,
      options: z.array(z.strictObject({ option: optionId, count: cell })),
    }),
  ),
  /** Typed answers per step, sorted alphabetically so their order says nothing. */
  texts: z.array(z.strictObject({ step: stepId, texts: z.array(z.string()) })),
  /**
   * The pack ladder per price: sessions shown the price, answered or not, and their
   * yes answers. Someone who left at a price counts as not yes.
   */
  ladder: z.array(
    z.strictObject({
      price: z.union(STUDY_PACK_PRICES.map((price) => z.literal(price))),
      shown: cell,
      yes: cell,
    }),
  ),
  pilot: z.strictObject({
    forms: count,
    joinPilot: count,
    laterEmail: count,
    houses: z.array(
      z.strictObject({
        house: z.enum(STUDY_PILOT_HOUSES),
        total: cell,
        weeks: z.array(
          z.strictObject({ week: z.enum(STUDY_PILOT_WEEKS), count: cell }),
        ),
      }),
    ),
  }),
});

export type StudySurvey = z.infer<typeof studySurveySchema>;
export type StudyLanguage = z.infer<typeof studyLanguageSchema>;
export type StudyConfig = z.infer<typeof studyConfigSchema>;
export type StudyStart = z.infer<typeof studyStartSchema>;
export type StudyAnswer = z.infer<typeof studyAnswerSchema>;
export type StudyEventKind = (typeof STUDY_EVENT_KINDS)[number];
export type StudyEvents = z.infer<typeof studyEventsSchema>;
export type StudyContact = z.infer<typeof studyContactSchema>;
export type StudyPilot = z.infer<typeof studyPilotSchema>;
export type StudyWithdrawal = z.infer<typeof studyWithdrawalSchema>;
export type StudyResults = z.infer<typeof studyResultsSchema>;
export type StudyReport = z.infer<typeof studyReportSchema>;
