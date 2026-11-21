import type { IncomingMessage, ServerResponse } from "node:http";
import type { z } from "zod";
import {
  STUDY_ROUTES,
  studyAnswerSchema,
  studyContactSchema,
  studyEventsSchema,
  studyPilotSchema,
  studyStartSchema,
  studyVersionSchema,
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
/** Database reads for the shared counts per minute, over all wording versions. */
export const STUDY_RESULTS_READS_PER_MINUTE = 30;

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
 * A cap per minute over all clients, so the server needs no client address. Past it,
 * the request is refused with the time until the minute ends.
 */
function createMinuteCap(now: () => Date, limit: number, busy: string) {
  let windowEnd = 0;
  let used = 0;
  return (response: ServerResponse) => {
    const time = now().getTime();
    if (time >= windowEnd) {
      windowEnd = time + 60_000;
      used = 0;
    }
    if (used >= limit) {
      response.setHeader("Retry-After", Math.ceil((windowEnd - time) / 1000));
      throw new AgentError(429, "STUDY_BUSY", busy);
    }
    used++;
  };
}

const invalidStudyRequest = () =>
  new AgentError(
    400,
    "INVALID_STUDY_REQUEST",
    "The study request is not valid.",
  );

function parseStudyBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const consentMissing = result.error.issues.some(
    ({ path }) => path[0] === "consent",
  );
  throw consentMissing
    ? new AgentError(400, "STUDY_CONSENT_REQUIRED", "Agree before taking part.")
    : invalidStudyRequest();
}

/**
 * Keeps each wording version's counts for a minute; a failed read is not kept. Counts
 * that ran out are dropped, and the reads behind the cache are capped, so asking for
 * many versions grows neither the cache nor the load on the database.
 */
function createResultsCache(now: () => Date) {
  const cached = new Map<string, { results: StudyResults; until: number }>();
  const capReads = createMinuteCap(
    now,
    STUDY_RESULTS_READS_PER_MINUTE,
    "The study's results are asked for often. Please retry in a minute.",
  );
  return async (
    store: StudyStore,
    version: string,
    response: ServerResponse,
  ) => {
    const time = now().getTime();
    for (const [key, entry] of cached)
      if (time >= entry.until) cached.delete(key);
    const kept = cached.get(version);
    if (kept) return kept.results;
    capReads(response);
    const results = await store.results(version);
    cached.set(version, { results, until: time + STUDY_RESULTS_MAX_AGE_MS });
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
  // Every write counts, valid or not, so that malformed requests cannot bypass the cap.
  const capWrites = createMinuteCap(
    now,
    STUDY_WRITES_PER_MINUTE,
    "The study is receiving many answers. Please retry in a minute.",
  );
  const cachedResults = createResultsCache(now);
  const config: RouteHandler = ({ response }) => {
    const open = openStudy(study, now);
    const body: StudyConfig = open ? open.config : { open: false };
    send(response, 200, body);
  };
  // Each participant asks for the counts of their own wording version.
  const results: RouteHandler = async ({ response, url }) => {
    const open = openStudy(study, now);
    if (!open) throw studyClosed();
    const version = studyVersionSchema.safeParse(
      url.searchParams.get("version"),
    );
    if (!version.success) throw invalidStudyRequest();
    send(
      response,
      200,
      await cachedResults(open.store, version.data, response),
    );
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
