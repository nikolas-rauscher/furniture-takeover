import type { z } from "zod";
import {
  surveyOf,
  type StudyAnswer,
  type StudyContact,
  type StudyEvents,
  type StudyPilot,
  type StudyStart,
  type StudyWithdrawal,
} from "../shared/study.ts";
import { AgentError } from "./errors.ts";
import { studyReportRowsSchema } from "./study-report.ts";
import {
  namedStudyErrors,
  unknownSession,
  type StudyStore,
} from "./study-store.ts";

const studyUnavailable = (options?: ErrorOptions) =>
  new AgentError(
    503,
    "STUDY_UNAVAILABLE",
    "The study cannot be reached at the moment. Please try again.",
    options,
  );

type ErrorName = keyof typeof namedStudyErrors;
const isErrorName = (name: unknown): name is ErrorName =>
  typeof name === "string" && name in namedStudyErrors;

/** Account transport: the service key calls the study functions of the Supabase project. */
export function createSupabaseStudyStore(
  url: string,
  secretKey: string,
): StudyStore {
  async function call(name: string, args: Record<string, unknown>) {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: secretKey, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    }).catch((cause: unknown) => {
      throw studyUnavailable({ cause });
    });
    if (response.ok) return response;
    const failure = await response.json().catch((cause: unknown) => {
      throw studyUnavailable({ cause });
    });
    const reason: unknown = failure?.message;
    if (reason === "study_session_unknown") throw unknownSession();
    if (isErrorName(reason)) throw namedStudyErrors[reason];
    // The status and database error code identify the failure; the message may quote stored values.
    throw studyUnavailable({
      cause: new Error(
        `Study function ${name} failed with status ${response.status}, code ${failure?.code}.`,
      ),
    });
  }
  const write = async (name: string, args: Record<string, unknown>) => {
    await call(name, args);
  };
  async function readJson<T>(
    name: string,
    args: Record<string, unknown>,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const response = await call(name, args);
    const body = await response.json().catch((cause: unknown) => {
      throw studyUnavailable({ cause });
    });
    const parsed = schema.safeParse(body);
    if (parsed.success) return parsed.data;
    throw studyUnavailable({ cause: parsed.error });
  }
  return {
    start: (input: StudyStart) =>
      write("study_start", {
        p_session: input.session,
        p_survey: surveyOf(input),
        p_version: input.version,
        p_language: input.language ?? null,
        p_source: input.source,
        p_device: input.device,
      }),
    saveAnswer: (input: StudyAnswer) =>
      write("study_save_answer", {
        p_session: input.session,
        p_step: input.step,
        p_chosen: input.chosen,
        p_first_chosen: input.firstChosen ?? null,
        p_shown: input.shown,
        p_text: input.text,
        p_elapsed_ms: input.elapsedMs,
        // v1 sends no revision; its saves replace each other in order.
        p_revision: input.revision ?? 0,
      }),
    saveEvents: (input: StudyEvents) =>
      write("study_save_events", {
        p_session: input.session,
        p_events: input.events,
      }),
    saveContact: (input: StudyContact) =>
      write("study_save_contact", {
        p_email: input.email,
        p_pilot: input.pilot,
        p_session: input.session,
      }),
    savePilot: (input: StudyPilot) =>
      write("study_save_pilot", {
        p_email: input.email,
        p_launch_news: input.launchNews,
        p_try_early: input.tryEarly,
        p_interview: input.interview,
        p_future_surveys: input.futureSurveys,
        p_roles: input.roles,
        p_place: input.place,
      }),
    withdraw: (input: StudyWithdrawal) =>
      write("study_withdraw", { p_session: input.session }),
    reportRows: (requestedBy: string | undefined) => {
      if (!requestedBy)
        throw new Error("Account mode reads the results page for a user.");
      return readJson(
        "study_report_rows",
        { p_user: requestedBy },
        studyReportRowsSchema,
      );
    },
  };
}
