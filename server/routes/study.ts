import type { IncomingMessage, ServerResponse } from "node:http";
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
import { demoAdminHeader } from "../../shared/admin.ts";
import type { CloudAccess } from "../cloud.ts";
import { adminFailure } from "../demo-admin.ts";
import { AgentError } from "../errors.ts";
import { buildStudyReport } from "../study-report.ts";
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
export const isCollecting = (config: StudyAccess["config"], now: Date) =>
  config.deleteBy > now.toISOString().slice(0, 10);

function openStudy(
  study: StudyAccess | undefined,
  now: () => Date,
): StudyAccess | undefined {
  return study && isCollecting(study.config, now()) ? study : undefined;
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
    ({ path }) => path[0] === "consent",
  );
  throw consentMissing
    ? new AgentError(400, "STUDY_CONSENT_REQUIRED", "Agree before taking part.")
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

/**
 * Who asks for the results page. In account mode it is the signed-in user, whom the
 * database checks against the admins; the demo has no accounts, so its admin area
 * opens in developer mode, as the rest of the demo's admin area does.
 */
async function reportRequester(
  request: IncomingMessage,
  authorize: CloudAccess["authorize"] | undefined,
) {
  if (authorize) return authorize(request.headers.authorization, false);
  if (request.headers[demoAdminHeader.toLowerCase()] !== "1")
    throw adminFailure("admin_required", 403);
  return undefined;
}

export function createStudyRoutes(
  study?: StudyAccess,
  authorize?: CloudAccess["authorize"],
): RouteTable {
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
  // Configured is enough: the counts stay readable after collection closes, until deletion.
  const report: RouteHandler = async ({ request, response, url }) => {
    if (!study) throw studyClosed();
    const requestedBy = await reportRequester(request, authorize);
    const rows = await study.store.reportRows(requestedBy);
    send(
      response,
      200,
      buildStudyReport(rows, url.searchParams.get("version")),
    );
  };
  const collecting = () => openStudy(study, now);
  // Configured is enough: a withdrawal is accepted for as long as the data is kept.
  const stored = () => study;
  const write =
    <T>(
      reachable: () => StudyAccess | undefined,
      schema: z.ZodType<T>,
      save: (store: StudyStore, input: T) => void | Promise<void>,
      reply: { saved: true } | { removed: true } = { saved: true },
    ): RouteHandler =>
    async ({ request, response }) => {
      const target = reachable();
      if (!target) throw studyClosed();
      requireJson(request);
      capWrites(response);
      const input = parseStudyBody(
        schema,
        await readBody(request, STUDY_BODY_LIMIT),
      );
      await save(target.store, input);
      send(response, 200, reply);
    };
  return {
    [`GET ${STUDY_ROUTES.config}`]: config,
    [`GET ${STUDY_ROUTES.results}`]: results,
    [`GET ${STUDY_ROUTES.report}`]: report,
    [`POST ${STUDY_ROUTES.sessions}`]: write(
      collecting,
      studyStartSchema,
      (store, input) => store.start(input),
    ),
    [`POST ${STUDY_ROUTES.answers}`]: write(
      collecting,
      studyAnswerSchema,
      (store, input) => store.saveAnswer(input),
    ),
    [`POST ${STUDY_ROUTES.events}`]: write(
      collecting,
      studyEventsSchema,
      (store, input) => store.saveEvents(input),
    ),
    [`POST ${STUDY_ROUTES.contacts}`]: write(
      collecting,
      studyContactSchema,
      (store, input) => store.saveContact(input),
    ),
    [`POST ${STUDY_ROUTES.pilot}`]: write(
      collecting,
      studyPilotSchema,
      (store, input) => store.savePilot(input),
    ),
    [`POST ${STUDY_ROUTES.withdrawals}`]: write(
      stored,
      studyWithdrawalSchema,
      (store, input) => store.withdraw(input),
      { removed: true },
    ),
  };
}
