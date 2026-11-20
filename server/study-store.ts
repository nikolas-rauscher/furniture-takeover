import { DatabaseSync } from "node:sqlite";
import type { StudyAnswer, StudyContact, StudyStart } from "../shared/study.ts";
import { AgentError } from "./errors.ts";

export const STUDY_LIMITS = {
  answersPerSession: 60,
  sessions: 5_000,
  contacts: 2_000,
} as const;

export type StudyStore = {
  /** Starting a session that already exists changes nothing. */
  start: (input: StudyStart) => void | Promise<void>;
  /** Replaces the earlier answer for the same step. */
  saveAnswer: (input: StudyAnswer) => void | Promise<void>;
  /** One row per address; a repeated address updates its pilot flag and session link. */
  saveContact: (input: StudyContact) => void | Promise<void>;
  /** Only transports that hold a local resource have one. */
  close?: () => void;
};

const unknownSession = () =>
  new AgentError(
    404,
    "STUDY_SESSION_UNKNOWN",
    "This study session was not started.",
  );

const limitErrors = {
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
  study_contact_limit: new AgentError(
    429,
    "STUDY_CONTACT_LIMIT",
    "The study has reached its maximum number of contact addresses.",
  ),
};

const studyUnavailable = (options?: ErrorOptions) =>
  new AgentError(
    503,
    "STUDY_UNAVAILABLE",
    "The study could not save your answer. Please try again.",
    options,
  );

const normalizeEmail = (email: string) => email.trim().toLowerCase();

type LimitName = keyof typeof limitErrors;
const isLimitName = (name: unknown): name is LimitName =>
  typeof name === "string" && name in limitErrors;

/** Local demo transport: the study tables live in the demo database file. */
export function createSqliteStudyStore(
  path: string,
  clock = () => new Date(),
): StudyStore {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY, version TEXT NOT NULL, source TEXT NOT NULL,
      device TEXT NOT NULL, started_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_answers (
      session TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      step TEXT NOT NULL, chosen TEXT NOT NULL, shown TEXT NOT NULL,
      text TEXT NOT NULL, elapsed_ms INTEGER NOT NULL, saved_at TEXT NOT NULL,
      PRIMARY KEY (session, step)
    );
    CREATE TABLE IF NOT EXISTS study_contacts (
      email TEXT PRIMARY KEY, pilot INTEGER NOT NULL,
      session TEXT REFERENCES study_sessions(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    )`);
  const exists = (condition: string, ...values: string[]) =>
    db.prepare(`SELECT 1 FROM ${condition}`).get(...values) !== undefined;
  const count = (table: string, where = "1", ...values: string[]) =>
    Number(
      db
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`)
        .get(...values)!.n,
    );
  const inTransaction = (write: () => void) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      write();
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const requireSession = (id: string) => {
    if (!exists("study_sessions WHERE id = ?", id)) throw unknownSession();
  };
  return {
    start(input: StudyStart) {
      inTransaction(() => {
        if (exists("study_sessions WHERE id = ?", input.session)) return;
        if (count("study_sessions") >= STUDY_LIMITS.sessions)
          throw limitErrors.study_session_limit;
        db.prepare(
          "INSERT INTO study_sessions (id, version, source, device, started_at) VALUES (?, ?, ?, ?, ?)",
        ).run(
          input.session,
          input.version,
          input.source,
          input.device,
          clock().toISOString(),
        );
      });
    },
    saveAnswer(input: StudyAnswer) {
      inTransaction(() => {
        requireSession(input.session);
        const replaces = exists(
          "study_answers WHERE session = ? AND step = ?",
          input.session,
          input.step,
        );
        if (
          !replaces &&
          count("study_answers", "session = ?", input.session) >=
            STUDY_LIMITS.answersPerSession
        )
          throw limitErrors.study_answer_limit;
        db.prepare(
          `INSERT INTO study_answers (session, step, chosen, shown, text, elapsed_ms, saved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (session, step) DO UPDATE SET chosen = excluded.chosen,
             shown = excluded.shown, text = excluded.text,
             elapsed_ms = excluded.elapsed_ms, saved_at = excluded.saved_at`,
        ).run(
          input.session,
          input.step,
          JSON.stringify(input.chosen),
          JSON.stringify(input.shown),
          input.text,
          input.elapsedMs,
          clock().toISOString(),
        );
      });
    },
    saveContact(input: StudyContact) {
      inTransaction(() => {
        const email = normalizeEmail(input.email);
        if (input.session !== null) requireSession(input.session);
        if (
          !exists("study_contacts WHERE email = ?", email) &&
          count("study_contacts") >= STUDY_LIMITS.contacts
        )
          throw limitErrors.study_contact_limit;
        db.prepare(
          `INSERT INTO study_contacts (email, pilot, session, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (email) DO UPDATE SET pilot = excluded.pilot, session = excluded.session`,
        ).run(email, input.pilot ? 1 : 0, input.session, clock().toISOString());
      });
    },
    close: () => db.close(),
  };
}

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
    if (response.ok) return;
    const failure = await response.json().catch((cause: unknown) => {
      throw studyUnavailable({ cause });
    });
    const reason: unknown = failure?.message;
    if (reason === "study_session_unknown") throw unknownSession();
    if (isLimitName(reason)) throw limitErrors[reason];
    // The status and database error code identify the failure; the message may quote stored values.
    throw studyUnavailable({
      cause: new Error(
        `Study function ${name} failed with status ${response.status}, code ${failure?.code}.`,
      ),
    });
  }
  return {
    start: (input: StudyStart) =>
      call("study_start", {
        p_session: input.session,
        p_version: input.version,
        p_source: input.source,
        p_device: input.device,
      }),
    saveAnswer: (input: StudyAnswer) =>
      call("study_save_answer", {
        p_session: input.session,
        p_step: input.step,
        p_chosen: input.chosen,
        p_shown: input.shown,
        p_text: input.text,
        p_elapsed_ms: input.elapsedMs,
      }),
    saveContact: (input: StudyContact) =>
      call("study_save_contact", {
        p_email: input.email,
        p_pilot: input.pilot,
        p_session: input.session,
      }),
  };
}
