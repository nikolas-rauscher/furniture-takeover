import { z } from "zod";

/**
 * Wire contract of the user study on the tour page. The questions live in the client's
 * script; the server only checks the shape of what it stores.
 */

export const STUDY_ROUTES = {
  config: "/api/study/config",
  sessions: "/api/study/sessions",
  answers: "/api/study/answers",
  contacts: "/api/study/contacts",
} as const;

export const STUDY_TEXT_MAX = 280;
const MAX_OPTIONS = 12;
const MAX_STEP_MS = 60 * 60 * 1000;

const session = z.uuid();
const stepId = z.string().regex(/^[a-z][a-z0-9-]{1,39}$/);
const optionIds = z
  .array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/))
  .max(MAX_OPTIONS);

/** The study is open once the deployment names a contact and a deletion date. */
export const studyConfigSchema = z.discriminatedUnion("open", [
  z.strictObject({ open: z.literal(false) }),
  z.strictObject({
    open: z.literal(true),
    contact: z.email(),
    deleteBy: z.iso.date(),
  }),
]);

export const studyStartSchema = z.strictObject({
  session,
  /** Changes with the questions or their wording, so pilot answers can be told apart. */
  version: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,19}$/),
  /** Channel tag from the invitation link. */
  source: z.string().regex(/^[a-z0-9][a-z0-9-]{0,23}$/),
  device: z.enum(["phone", "desktop"]),
  /** A session only exists once the participant confirmed both. */
  adult: z.literal(true),
  consent: z.literal(true),
});

export const studyAnswerSchema = z.strictObject({
  session,
  step: stepId,
  /** Chosen options, in the order they were tapped. */
  chosen: optionIds,
  /** Options in the order shown, for steps that shuffle them; empty otherwise. */
  shown: optionIds,
  /** Free text, empty when the step has none or it was left blank. */
  text: z.string().trim().max(STUDY_TEXT_MAX),
  /** How long the step was on screen. */
  elapsedMs: z.number().int().min(0).max(MAX_STEP_MS),
});

export const studyContactSchema = z.strictObject({
  email: z.email().max(254),
  /** Wants an invitation to the test with real items, not only follow-up questions. */
  pilot: z.boolean(),
  /** Set only when the participant agreed to link the address to their answers. */
  session: session.nullable(),
});

export type StudyConfig = z.infer<typeof studyConfigSchema>;
export type StudyStart = z.infer<typeof studyStartSchema>;
export type StudyAnswer = z.infer<typeof studyAnswerSchema>;
export type StudyContact = z.infer<typeof studyContactSchema>;
