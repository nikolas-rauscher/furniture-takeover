import {
  STUDY_ROUTES,
  studyAnswerSchema,
  studyConfigSchema,
  studyContactSchema,
  studyEventsSchema,
  studyPilotSchema,
  studyResultsSchema,
  studyStartSchema,
  type StudyAnswer,
  type StudyConfig,
  type StudyContact,
  type StudyEvents,
  type StudyPilot,
  type StudyResults,
  type StudyStart,
} from "../../shared/study.ts";

/** The first retry waits this long, and each later one twice as long as the one before. */
const RETRY_BASE_MS = 800;
/** A wait the server asks for is kept up to this long. */
const MAX_REQUESTED_WAIT_MS = 60_000;

/** A study request the server answered with an error status. */
export class StudyRequestError extends Error {
  readonly status: number;
  /** The wait the server asked for in `Retry-After`; null without a readable one. */
  readonly retryAfterMs: number | null;

  constructor(message: string, status: number, retryAfterMs: number | null) {
    super(message);
    this.name = "StudyRequestError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/** `Retry-After` in seconds or as an HTTP date, as a wait from `now`. */
export function readRetryAfter(header: string | null, now = Date.now()) {
  if (header === null || header.trim() === "") return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

async function failure(response: Response, what: string) {
  const detail = await response.text();
  return new StudyRequestError(
    `Could not ${what} (${response.status}). ${detail}`.trim(),
    response.status,
    readRetryAfter(response.headers.get("Retry-After")),
  );
}

/** A refusal that sending again cannot change: a client error other than a timeout or a rate limit. */
export function isFinalRefusal(error: Error): boolean {
  if (!(error instanceof StudyRequestError)) return false;
  const { status } = error;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/**
 * How long to wait before retry `attempt` (1 for the first): as long as a busy or
 * unavailable server asked, up to a minute, or else a pause that doubles each time.
 */
export function retryDelayMs(attempt: number, error: Error): number {
  const asked =
    error instanceof StudyRequestError &&
    (error.status === 429 || error.status === 503)
      ? error.retryAfterMs
      : null;
  if (asked !== null) return Math.min(asked, MAX_REQUESTED_WAIT_MS);
  return RETRY_BASE_MS * 2 ** (attempt - 1);
}

async function post(route: string, body: unknown, what: string) {
  const response = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response, what);
}

export async function readStudyConfig(): Promise<StudyConfig> {
  const response = await fetch(STUDY_ROUTES.config);
  if (!response.ok) throw await failure(response, "read the study's setup");
  return studyConfigSchema.parse(await response.json());
}

export function startSession(start: StudyStart) {
  return post(
    STUDY_ROUTES.sessions,
    studyStartSchema.parse(start),
    "start the session",
  );
}

export function saveAnswer(answer: StudyAnswer) {
  return post(
    STUDY_ROUTES.answers,
    studyAnswerSchema.parse(answer),
    `save the answer to ${answer.step}`,
  );
}

export function sendContact(contact: StudyContact) {
  return post(
    STUDY_ROUTES.contacts,
    studyContactSchema.parse(contact),
    "send the email address",
  );
}

export function saveEvents(events: StudyEvents) {
  return post(
    STUDY_ROUTES.events,
    studyEventsSchema.parse(events),
    `save events ${events.events[0].seq} to ${events.events.at(-1)?.seq}`,
  );
}

export function sendPilot(pilot: StudyPilot) {
  return post(
    STUDY_ROUTES.pilot,
    studyPilotSchema.parse(pilot),
    "send the pilot sign-up",
  );
}

/** The shared counts of one wording version: the participant's own. */
export async function readResults(version: string): Promise<StudyResults> {
  const query = new URLSearchParams({ version });
  const response = await fetch(`${STUDY_ROUTES.results}?${query}`);
  if (!response.ok) throw await failure(response, "read the results");
  return studyResultsSchema.parse(await response.json());
}
