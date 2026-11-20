import type { ServerResponse } from "node:http";
import type { z } from "zod";
import {
  STUDY_ROUTES,
  studyAnswerSchema,
  studyContactSchema,
  studyEventsSchema,
  studyPilotSchema,
  studyStartSchema,
  studyWithdrawalSchema,
  type StudyConfig,
  type StudyResults,
} from "../../shared/study.ts";
import { AgentError } from "../errors.ts";
import { readBody, requireJson, send } from "../http-io.ts";
import type { StudyStore } from "../study-store.ts";
import type { RouteHandler, RouteTable, StudyAccess } from "./types.ts";

export const STUDY_BODY_LIMIT = 8 * 1024;
export const STUDY_WRITES_PER_MINUTE = 300;
/** The shared counts change slowly, so one database read serves a minute of participants. */
export const STUDY_RESULTS_MAX_AGE_MS = 60_000;

const studyClosed = () =>
  new AgentError(
    403,
    "STUDY_CLOSED",
    "The study is not open. The tour page is available without it.",
  );

/** The deletion day itself is already closed: nothing is collected after the promised date. */
function openStudy(
  study: StudyAccess | undefined,
  now: () => Date,
): StudyAccess | undefined {
  const today = now().toISOString().slice(0, 10);
  return study && study.config.deleteBy > today ? study : undefined;
}

/**
 * One cap for all study writes, so the server needs no client address. Every write counts,
 * valid or not, so that malformed requests cannot be used to bypass it.
 */
function createWriteCap(now: () => Date) {
  let windowEnd = 0;
  let writes = 0;
  return (response: ServerResponse) => {
    const time = now().getTime();
    if (time >= windowEnd) {
      windowEnd = time + 60_000;
      writes = 0;
    }
    if (writes >= STUDY_WRITES_PER_MINUTE) {
      response.setHeader("Retry-After", Math.ceil((windowEnd - time) / 1000));
      throw new AgentError(
        429,
        "STUDY_BUSY",
        "The study is receiving many answers. Please retry in a minute.",
      );
    }
    writes++;
  };
}

function parseStudyBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const consentMissing = result.error.issues.some(
    ({ path }) => path[0] === "adult" || path[0] === "consent",
  );
  throw consentMissing
    ? new AgentError(
        400,
        "STUDY_CONSENT_REQUIRED",
        "Confirm that you are 18 or older and agree before taking part.",
      )
    : new AgentError(
        400,
        "INVALID_STUDY_REQUEST",
        "The study request is not valid.",
      );
}

/** Keeps the shared counts for a minute; a failed read is not kept. */
function createResultsCache(now: () => Date) {
  let cached: { results: StudyResults; until: number } | undefined;
  return async (store: StudyStore) => {
    const time = now().getTime();
    if (cached && time < cached.until) return cached.results;
    const results = await store.results();
    cached = { results, until: time + STUDY_RESULTS_MAX_AGE_MS };
    return results;
  };
}

export function createStudyRoutes(study?: StudyAccess): RouteTable {
  const now = study?.now ?? (() => new Date());
  const capWrites = createWriteCap(now);
  const cachedResults = createResultsCache(now);
  const config: RouteHandler = ({ response }) => {
    const open = openStudy(study, now);
    const body: StudyConfig = open ? open.config : { open: false };
    send(response, 200, body);
  };
  const results: RouteHandler = async ({ response }) => {
    const open = openStudy(study, now);
    if (!open) throw studyClosed();
    send(response, 200, await cachedResults(open.store));
  };
  const write =
    <T>(
      schema: z.ZodType<T>,
      save: (store: StudyStore, input: T) => void | Promise<void>,
      reply: { saved: true } | { removed: true } = { saved: true },
    ): RouteHandler =>
    async ({ request, response }) => {
      const open = openStudy(study, now);
      if (!open) throw studyClosed();
      requireJson(request);
      capWrites(response);
      const input = parseStudyBody(
        schema,
        await readBody(request, STUDY_BODY_LIMIT),
      );
      await save(open.store, input);
      send(response, 200, reply);
    };
  return {
    [`GET ${STUDY_ROUTES.config}`]: config,
    [`GET ${STUDY_ROUTES.results}`]: results,
    [`POST ${STUDY_ROUTES.sessions}`]: write(studyStartSchema, (store, input) =>
      store.start(input),
    ),
    [`POST ${STUDY_ROUTES.answers}`]: write(studyAnswerSchema, (store, input) =>
      store.saveAnswer(input),
    ),
    [`POST ${STUDY_ROUTES.events}`]: write(studyEventsSchema, (store, input) =>
      store.saveEvents(input),
    ),
    [`POST ${STUDY_ROUTES.contacts}`]: write(
      studyContactSchema,
      (store, input) => store.saveContact(input),
    ),
    [`POST ${STUDY_ROUTES.pilot}`]: write(studyPilotSchema, (store, input) =>
      store.savePilot(input),
    ),
    [`POST ${STUDY_ROUTES.withdrawals}`]: write(
      studyWithdrawalSchema,
      (store, input) => store.withdraw(input),
      { removed: true },
    ),
  };
}
