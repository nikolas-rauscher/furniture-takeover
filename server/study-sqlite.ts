import { DatabaseSync } from "node:sqlite";
import {
  surveyOf,
  type StudyAnswer,
  type StudyContact,
  type StudyEvents,
  type StudyPilot,
  type StudyStart,
} from "../shared/study.ts";
import { studyReportRowsSchema, type StudyReportRows } from "./study-report.ts";
import {
  STUDY_LIMITS,
  namedStudyErrors,
  normalizeEmail,
  unknownSession,
  type StudyStore,
} from "./study-store.ts";

const SCHEMA = `PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY, survey TEXT NOT NULL, version TEXT NOT NULL, language TEXT,
    source TEXT NOT NULL, device TEXT NOT NULL, started_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS study_answers (
    session TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    step TEXT NOT NULL, chosen TEXT NOT NULL, first_chosen TEXT, shown TEXT NOT NULL,
    text TEXT NOT NULL, elapsed_ms INTEGER NOT NULL, saved_at TEXT NOT NULL,
    PRIMARY KEY (session, step)
  );
  CREATE TABLE IF NOT EXISTS study_events (
    session TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL, kind TEXT NOT NULL, step TEXT, detail TEXT,
    at TEXT NOT NULL, received_at TEXT NOT NULL,
    PRIMARY KEY (session, seq)
  );
  CREATE TABLE IF NOT EXISTS study_contacts (
    email TEXT PRIMARY KEY, pilot INTEGER NOT NULL,
    session TEXT REFERENCES study_sessions(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS study_pilot (
    email TEXT PRIMARY KEY, launch_news INTEGER NOT NULL, try_early INTEGER NOT NULL,
    future_surveys INTEGER NOT NULL, place TEXT, created_at TEXT NOT NULL,
    interview INTEGER NOT NULL DEFAULT 0, roles TEXT NOT NULL DEFAULT '[]'
  )`;

/**
 * Demo files written before v3 hold v1 sessions only, so their sessions get `survey = 'v1'`
 * and no language or first answers. Forms from before v4 had no interview tick.
 */
const COLUMNS_ADDED_LATER = [
  ["study_sessions", "survey", "TEXT NOT NULL DEFAULT 'v1'"],
  ["study_sessions", "language", "TEXT"],
  ["study_answers", "first_chosen", "TEXT"],
  ["study_answers", "revision", "INTEGER NOT NULL DEFAULT 0"],
  ["study_pilot", "interview", "INTEGER NOT NULL DEFAULT 0"],
  ["study_pilot", "roles", "TEXT NOT NULL DEFAULT '[]'"],
] as const;

/** A v3 file's one role per form becomes the roles it stands for, as in Postgres. */
const ROLES_OF_V3 = `UPDATE study_pilot SET roles = CASE role
  WHEN 'seller' THEN '["sell"]' WHEN 'buyer' THEN '["buy"]' WHEN 'both' THEN '["buy","sell"]'
  ELSE '[]' END WHERE roles = '[]' AND role IS NOT NULL`;

function addLaterColumns(db: DatabaseSync) {
  for (const [table, column, definition] of COLUMNS_ADDED_LATER) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some(({ name }) => name === column))
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  const pilotColumns = db.prepare("PRAGMA table_info(study_pilot)").all();
  if (pilotColumns.some(({ name }) => name === "role")) db.exec(ROLES_OF_V3);
}

/** Local demo transport: the study tables live in the demo database file. */
export function createSqliteStudyStore(
  path: string,
  clock = () => new Date(),
): StudyStore {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  addLaterColumns(db);
  const now = () => clock().toISOString();
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
  const surveyOfSession = (id: string) => {
    const row = db
      .prepare("SELECT survey FROM study_sessions WHERE id = ?")
      .get(id);
    if (!row) throw unknownSession();
    return String(row.survey);
  };
  const requireSession = (id: string) => void surveyOfSession(id);
  return {
    start(input: StudyStart) {
      inTransaction(() => {
        if (exists("study_sessions WHERE id = ?", input.session)) return;
        if (count("study_sessions") >= STUDY_LIMITS.sessions)
          throw namedStudyErrors.study_session_limit;
        db.prepare(
          `INSERT INTO study_sessions (id, survey, version, language, source, device, started_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          input.session,
          surveyOf(input),
          input.version,
          input.language ?? null,
          input.source,
          input.device,
          now(),
        );
      });
    },
    saveAnswer(input: StudyAnswer) {
      inTransaction(() => {
        const survey = surveyOfSession(input.session);
        if ((survey === "v3") !== (input.firstChosen !== undefined))
          throw namedStudyErrors.study_survey_mismatch;
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
          throw namedStudyErrors.study_answer_limit;
        db.prepare(
          `INSERT INTO study_answers
             (session, step, chosen, first_chosen, shown, text, elapsed_ms, revision, saved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (session, step) DO UPDATE SET chosen = excluded.chosen,
             shown = excluded.shown, text = excluded.text,
             elapsed_ms = excluded.elapsed_ms, revision = excluded.revision,
             saved_at = excluded.saved_at
           WHERE excluded.revision >= study_answers.revision`,
        ).run(
          input.session,
          input.step,
          JSON.stringify(input.chosen),
          input.firstChosen ? JSON.stringify(input.firstChosen) : null,
          JSON.stringify(input.shown),
          input.text,
          input.elapsedMs,
          // v1 sends no revision; its saves replace each other in order.
          input.revision ?? 0,
          now(),
        );
      });
    },
    saveEvents(input: StudyEvents) {
      inTransaction(() => {
        requireSession(input.session);
        const insert = db.prepare(
          `INSERT INTO study_events (session, seq, kind, step, detail, at, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (session, seq) DO NOTHING`,
        );
        const receivedAt = now();
        for (const event of input.events)
          insert.run(
            input.session,
            event.seq,
            event.kind,
            event.step,
            event.detail,
            event.at,
            receivedAt,
          );
        if (
          count("study_events", "session = ?", input.session) >
          STUDY_LIMITS.eventsPerSession
        )
          throw namedStudyErrors.study_event_limit;
      });
    },
    // A full list refuses every address, listed or not, so the answer never tells.
    saveContact(input: StudyContact) {
      inTransaction(() => {
        if (input.session !== null) requireSession(input.session);
        if (count("study_contacts") >= STUDY_LIMITS.contacts)
          throw namedStudyErrors.study_contact_limit;
        db.prepare(
          `INSERT INTO study_contacts (email, pilot, session, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (email) DO NOTHING`,
        ).run(
          normalizeEmail(input.email),
          input.pilot ? 1 : 0,
          input.session,
          now(),
        );
      });
    },
    savePilot(input: StudyPilot) {
      inTransaction(() => {
        if (count("study_pilot") >= STUDY_LIMITS.pilot)
          throw namedStudyErrors.study_pilot_limit;
        db.prepare(
          `INSERT INTO study_pilot
             (email, launch_news, try_early, interview, future_surveys, roles, place, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING`,
        ).run(
          normalizeEmail(input.email),
          input.launchNews ? 1 : 0,
          input.tryEarly ? 1 : 0,
          input.interview ? 1 : 0,
          input.futureSurveys ? 1 : 0,
          JSON.stringify(input.roles),
          input.place,
          now(),
        );
      });
    },
    withdraw({ session }) {
      db.prepare("DELETE FROM study_sessions WHERE id = ?").run(session);
    },
    reportRows(): StudyReportRows {
      const sessions = db
        .prepare(
          `SELECT s.version, substr(s.started_at, 1, 10) AS day, s.source,
             (SELECT json_group_array(DISTINCT e.step) FROM study_events e
              WHERE e.session = s.id AND e.kind = 'shown' AND e.step IS NOT NULL) AS shown,
             (SELECT e.step FROM study_events e WHERE e.session = s.id AND e.kind = 'shown'
              ORDER BY e.seq DESC LIMIT 1) AS last_shown,
             EXISTS (SELECT 1 FROM study_events e
               WHERE e.session = s.id AND e.kind = 'core-complete') AS completed,
             EXISTS (SELECT 1 FROM study_events e
               WHERE e.session = s.id AND e.kind = 'end') AS ended
           FROM study_sessions s WHERE s.survey = 'v3'`,
        )
        .all()
        .map((row) => ({
          version: row.version,
          day: row.day,
          source: row.source,
          shown: JSON.parse(String(row.shown)),
          lastShown: row.last_shown,
          completed: row.completed === 1,
          ended: row.ended === 1,
        }));
      const answers = db
        .prepare(
          `SELECT s.version, a.step, a.chosen, a.text FROM study_answers a
           JOIN study_sessions s ON s.id = a.session WHERE s.survey = 'v3'`,
        )
        .all()
        .map((row) => ({
          version: row.version,
          step: row.step,
          chosen: JSON.parse(String(row.chosen)),
          text: row.text,
        }));
      const pilot = db
        .prepare(
          "SELECT launch_news, try_early, interview, future_surveys, roles, place FROM study_pilot",
        )
        .all()
        .map((row) => ({
          launchNews: row.launch_news === 1,
          tryEarly: row.try_early === 1,
          interview: row.interview === 1,
          futureSurveys: row.future_surveys === 1,
          roles: JSON.parse(String(row.roles)),
          place: row.place,
        }));
      return studyReportRowsSchema.parse({ sessions, answers, pilot });
    },
    close: () => db.close(),
  };
}
