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
  /** Admins only: the counts of the results page. */
  report: "/api/study/report",
} as const;

export const STUDY_SURVEYS = ["v1", "v3"] as const;
export const STUDY_LANGUAGES = ["en", "fr", "de"] as const;
export const STUDY_TEXT_MAX = 280;
export const STUDY_EVENTS_PER_BATCH = 40;
/** The server keeps at most this many events per session, so the client sends no more. */
export const STUDY_EVENTS_PER_SESSION = 600;

/** Room for all 16 obstacles when buying and selling roles overlap. */
const MAX_OPTIONS = 16;
const MAX_STEP_MS = 60 * 60 * 1000;
const MAX_REVISION = 100_000;
const MAX_EVENT_SEQ = 9_999;

const session = z.uuid();
const stepId = z.string().regex(/^[a-z][a-z0-9-]{1,39}$/);
const optionId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);
/** An answer's option may also name an amount with a decimal point, such as `chf-3.5`. */
const answerOption = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,39}$/);
const optionIds = z.array(answerOption).max(MAX_OPTIONS);
const studySurveySchema = z.enum(STUDY_SURVEYS);
const studyLanguageSchema = z.enum(STUDY_LANGUAGES);
/** Changes with the questions or their wording, so answers to different wordings stay apart. */
const studyVersionSchema = z.string().regex(/^[a-z0-9][a-z0-9.-]{0,19}$/);

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
    /** The wording version, so pretest answers can be told apart. */
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

/** What someone who wants to try takeover early would try; "not-sure" stands alone. */
export const STUDY_PILOT_ROLES = [
  "buy",
  "get-free",
  "sell",
  "give-away",
  "not-sure",
] as const;
/** Those who would sell or give away count as sellers; those who would buy or get, as buyers. */
export const STUDY_SELLING_ROLES = ["sell", "give-away"] as const;
export const STUDY_BUYING_ROLES = ["buy", "get-free"] as const;
/** Where a participant who wants to try takeover early lives. */
export const STUDY_PILOT_PLACES = [
  "vortex",
  "atrium",
  "triaudes",
  "fmel-other",
  "other-res",
  "flat",
  "elsewhere",
] as const;

/**
 * v3 form at the end of the survey. Stored without a session, so it cannot be linked to
 * answers. Roles and place are asked only of those who want to try takeover early.
 */
export const studyPilotSchema = z
  .strictObject({
    email: z.email().max(254),
    /** "Tell me when takeover launches". */
    launchNews: z.boolean(),
    /** "I'd like to try takeover early". */
    tryEarly: z.boolean(),
    /** "I'm up for a 15-minute chat". */
    interview: z.boolean(),
    /** "Invite me to future surveys". */
    futureSurveys: z.boolean(),
    /** Everything they would try; empty unless they want to try takeover early. */
    roles: z.array(z.enum(STUDY_PILOT_ROLES)).max(STUDY_PILOT_ROLES.length),
    place: z.enum(STUDY_PILOT_PLACES).nullable(),
    /**
     * The wording version of the survey it ends, so its counts match that version's
     * finishers. The same for everyone in a run, so it identifies nobody.
     */
    version: studyVersionSchema,
  })
  .refine(
    (form) =>
      form.launchNews || form.tryEarly || form.interview || form.futureSurveys,
    "Tick at least one box.",
  )
  .refine(
    (form) => form.tryEarly === (form.roles.length > 0 && form.place !== null),
    "Roles and place come with trying takeover early, and only with it.",
  )
  .refine(
    (form) => new Set(form.roles).size === form.roles.length,
    "Each role is named once.",
  )
  .refine(
    (form) => !form.roles.includes("not-sure") || form.roles.length === 1,
    "Not sure yet stands alone.",
  );

/** Removes the session with its answers and events. Removing it twice changes nothing. */
export const studyWithdrawalSchema = z.strictObject({ session });

/**
 * The v3 core screens in their order, conditional ones included. The results page reads
 * its funnel along this list; the client's script test keeps the two in step.
 */
export const STUDY_V3_CORE_SCREENS = [
  "part-last-time",
  "last-role",
  "last-item",
  "last-occasion",
  "last-how",
  "last-outcome",
  "last-trouble",
  "last-transport",
  "last-messages",
  "part-home",
  "trade-frequency",
  "idle-items",
  "idle-release",
  "idle-why",
  "seeking",
  "max-distance",
  "part-the-app",
  "app-sell",
  "check-listing",
  "draft",
  "app-deal",
  "trust-signals",
  "delegate",
  "wanted-react",
  "part-price",
  "wtp-monthly",
  "pay-model",
  "pay-for",
  "who",
  "housing",
  "age",
  "gender",
] as const;

/** The move-out pack's prices in CHF on the survey's price ladder, from low to high. */
export const STUDY_PACK_PRICES = [2, 5, 8] as const;
/** Every participant is asked this price first. */
export const STUDY_PACK_START = 5;

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
      options: z.array(z.strictObject({ option: answerOption, count: cell })),
    }),
  ),
  /** Typed answers per step, sorted alphabetically so their order says nothing. */
  texts: z.array(z.strictObject({ step: stepId, texts: z.array(z.string()) })),
  /**
   * The pack ladder over everyone who entered it, with implied answers: yes at CHF 5
   * counts as yes at CHF 2. Someone who left at a price or was not sure counts as not yes.
   */
  ladder: z.strictObject({
    entered: cell,
    prices: z.array(
      z.strictObject({
        price: z.union(STUDY_PACK_PRICES.map((price) => z.literal(price))),
        yes: cell,
      }),
    ),
  }),
  pilot: z.strictObject({
    forms: count,
    launchNews: count,
    tryEarly: count,
    interview: count,
    futureSurveys: count,
    /**
     * Those who want to try takeover early, per place: sellers would sell or give away,
     * buyers would buy or get for free, so one form can count on both sides.
     */
    places: z.array(
      z.strictObject({
        place: z.enum(STUDY_PILOT_PLACES),
        sellers: cell,
        buyers: cell,
        undecided: cell,
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
export type StudyReport = z.infer<typeof studyReportSchema>;
