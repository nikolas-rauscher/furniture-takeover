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
} as const;

export const STUDY_SURVEYS = ["v1", "v3"] as const;
export const STUDY_LANGUAGES = ["en", "fr", "de"] as const;
export const STUDY_TEXT_MAX = 280;
export const STUDY_EVENTS_PER_BATCH = 40;
/** "How others answered" appears once this many v3 participants answered the desk task. */
export const STUDY_RESULTS_MINIMUM = 20;
/** The two v3 steps whose counts are shown to later participants. */
export const STUDY_RESULT_STEPS = {
  desk: "desk",
  trouble: "last-trouble",
} as const;

const MAX_OPTIONS = 12;
const MAX_STEP_MS = 60 * 60 * 1000;
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

export const studySurveySchema = z.enum(STUDY_SURVEYS);
export const studyLanguageSchema = z.enum(STUDY_LANGUAGES);

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
    /** Changes with the questions or their wording, so pilot answers can be told apart. */
    version: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,19}$/),
    /** Page language when the session started; a later switch is recorded as an event. */
    language: studyLanguageSchema.optional(),
    /** Channel tag from the invitation link. */
    source: z.string().regex(/^[a-z0-9][a-z0-9-]{0,23}$/),
    device: z.enum(["phone", "desktop"]),
    /** A session only exists once the participant confirmed both. */
    adult: z.literal(true),
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
});

/**
 * What an event records, with the meaning of `step` and `detail`:
 * - `shown`, `answered`, `skipped`, `changed`: step = the question.
 * - `back`: step = the step left, detail = the step returned to.
 * - `scene-played`, `scene-skipped`: step = the tour step, detail = the scene.
 * - `moment-tapped`, `moment-auto`: a key moment of a scene was tapped or advanced by
 *   itself; step = the tour step, detail = the moment.
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

/** Counts over all v3 sessions, shown at the end of the survey. */
export const studyResultsSchema = z.discriminatedUnion("ready", [
  z.strictObject({ ready: z.literal(false) }),
  z.strictObject({
    ready: z.literal(true),
    desk: tallySchema,
    trouble: tallySchema,
  }),
]);

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
