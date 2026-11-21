import {
  STUDY_EVENTS_PER_SESSION,
  type StudyAnswer,
  type StudyContact,
  type StudyEvents,
  type StudyPilot,
  type StudyResults,
  type StudyStart,
  type StudyWithdrawal,
} from "../shared/study.ts";
import { adminErrors } from "../shared/admin.ts";
import { AgentError } from "./errors.ts";
import type { StudyReportRows } from "./study-report.ts";

export const STUDY_LIMITS = {
  answersPerSession: 60,
  eventsPerSession: STUDY_EVENTS_PER_SESSION,
  sessions: 5_000,
  contacts: 2_000,
  pilot: 2_000,
} as const;

export type StudyStore = {
  /** Starting a session that already exists changes nothing. */
  start: (input: StudyStart) => void | Promise<void>;
  /** Replaces the earlier answer for the same step, but keeps its first answer. */
  saveAnswer: (input: StudyAnswer) => void | Promise<void>;
  /** An event that was stored before (same session and seq) is not stored again. */
  saveEvents: (input: StudyEvents) => void | Promise<void>;
  /**
   * One row per address, and the first one stands: a repeated address changes nothing
   * and is answered the same, so nobody can find out which addresses are listed.
   */
  saveContact: (input: StudyContact) => void | Promise<void>;
  /** One form per address, and the first one stands, as for `saveContact`. */
  savePilot: (input: StudyPilot) => void | Promise<void>;
  /** Deletes the session with its answers and events; an unknown session changes nothing. */
  withdraw: (input: StudyWithdrawal) => void | Promise<void>;
  /** The shared counts over the v3 sessions of one wording version. */
  results: (version: string) => StudyResults | Promise<StudyResults>;
  /**
   * The rows of the admin results page. In account mode `requestedBy` is the signed-in
   * user, and the database refuses anyone who is not an admin; the demo has no accounts.
   */
  reportRows: (
    requestedBy: string | undefined,
  ) => StudyReportRows | Promise<StudyReportRows>;
  /** Only transports that hold a local resource have one. */
  close?: () => void;
};

export const unknownSession = () =>
  new AgentError(
    404,
    "STUDY_SESSION_UNKNOWN",
    "This study session was not started.",
  );

/** Errors the database raises by name, shared by both transports. */
export const namedStudyErrors = {
  study_session_limit: new AgentError(
    429,
    "STUDY_SESSION_LIMIT",
    "The study has reached its maximum number of participants.",
  ),
  study_answer_limit: new AgentError(
    429,
    "STUDY_ANSWER_LIMIT",
    "This session has reached its maximum number of answers.",
  ),
  study_event_limit: new AgentError(
    429,
    "STUDY_EVENT_LIMIT",
    "This session has reached its maximum number of events.",
  ),
  study_contact_limit: new AgentError(
    429,
    "STUDY_CONTACT_LIMIT",
    "The study has reached its maximum number of contact addresses.",
  ),
  study_pilot_limit: new AgentError(
    429,
    "STUDY_PILOT_LIMIT",
    "The form at the end of the survey has reached its maximum number of addresses.",
  ),
  admin_required: new AgentError(
    403,
    "admin_required",
    adminErrors.admin_required,
  ),
  study_survey_mismatch: new AgentError(
    400,
    "STUDY_SURVEY_MISMATCH",
    "A v3 answer needs its first answer, and a v1 answer has none.",
  ),
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
