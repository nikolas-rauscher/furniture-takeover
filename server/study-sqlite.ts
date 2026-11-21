import { DatabaseSync } from "node:sqlite";
import {
  STUDY_RESULTS_MINIMUM,
  STUDY_RESULT_STEPS,
  surveyOf,
  type StudyAnswer,
  type StudyContact,
  type StudyEvents,
  type StudyPilot,
  type StudyResults,
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
    email TEXT PRIMARY KEY, role TEXT NOT NULL, house TEXT NOT NULL,
    weeks TEXT NOT NULL, items TEXT NOT NULL, join_pilot INTEGER NOT NULL,
    later_email INTEGER NOT NULL, created_at TEXT NOT NULL
  )`;

/**
 * Demo files written before v3 hold v1 sessions only, so their sessions get `survey = 'v1'`
 * and no language or first answers.
 */
const COLUMNS_ADDED_FOR_V3 = [
  ["study_sessions", "survey", "TEXT NOT NULL DEFAULT 'v1'"],
  ["study_sessions", "language", "TEXT"],
  ["study_answers", "first_chosen", "TEXT"],
] as const;

function addColumnsForV3(db: DatabaseSync) {
  for (const [table, column, definition] of COLUMNS_ADDED_FOR_V3) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some(({ name }) => name === column))
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

type Tally = Extract<StudyResults, { ready: true }>["desk"];

/** Local demo transport: the study tables live in the demo database file. */
export function createSqliteStudyStore(
  path: string,
  clock = () => new Date(),
): StudyStore {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  addColumnsForV3(db);
  db.exec(`CREATE TEMP VIEW study_v3_answers AS
    SELECT a.step, a.chosen FROM study_answers a
    JOIN study_sessions s ON s.id = a.session WHERE s.survey = 'v3'`);
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
  const tally = (step: string): Tally => ({
    answered: count("study_v3_answers", "step = ?", step),
    options: db
      .prepare(
        `SELECT option.value AS option, COUNT(*) AS count
         FROM study_v3_answers, json_each(study_v3_answers.chosen) AS option
         WHERE step = ? GROUP BY option.value ORDER BY count DESC, option.value`,
      )
      .all(step)
      .map((row) => ({ option: String(row.option), count: Number(row.count) })),
  });

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
             (session, step, chosen, first_chosen, shown, text, elapsed_ms, saved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (session, step) DO UPDATE SET chosen = excluded.chosen,
             shown = excluded.shown, text = excluded.text,
             elapsed_ms = excluded.elapsed_ms, saved_at = excluded.saved_at`,
        ).run(
          input.session,
          input.step,
          JSON.stringify(input.chosen),
          input.firstChosen ? JSON.stringify(input.firstChosen) : null,
          JSON.stringify(input.shown),
          input.text,
          input.elapsedMs,
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
    saveContact(input: StudyContact) {
      inTransaction(() => {
        const email = normalizeEmail(input.email);
        if (input.session !== null) requireSession(input.session);
        if (
          !exists("study_contacts WHERE email = ?", email) &&
          count("study_contacts") >= STUDY_LIMITS.contacts
        )
          throw namedStudyErrors.study_contact_limit;
        db.prepare(
          `INSERT INTO study_contacts (email, pilot, session, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (email) DO UPDATE SET pilot = excluded.pilot, session = excluded.session`,
        ).run(email, input.pilot ? 1 : 0, input.session, now());
      });
    },
    savePilot(input: StudyPilot) {
      inTransaction(() => {
        const email = normalizeEmail(input.email);
        if (
          !exists("study_pilot WHERE email = ?", email) &&
          count("study_pilot") >= STUDY_LIMITS.pilot
        )
          throw namedStudyErrors.study_pilot_limit;
        db.prepare(
          `INSERT INTO study_pilot
             (email, role, house, weeks, items, join_pilot, later_email, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (email) DO UPDATE SET role = excluded.role, house = excluded.house,
             weeks = excluded.weeks, items = excluded.items,
             join_pilot = excluded.join_pilot, later_email = excluded.later_email`,
        ).run(
          email,
          input.role,
          input.house,
          JSON.stringify(input.weeks),
          JSON.stringify(input.items),
          input.joinPilot ? 1 : 0,
          input.laterEmail ? 1 : 0,
          now(),
        );
      });
    },
    withdraw({ session }) {
      db.prepare("DELETE FROM study_sessions WHERE id = ?").run(session);
    },
    results(): StudyResults {
      const desk = tally(STUDY_RESULT_STEPS.desk);
      if (desk.answered < STUDY_RESULTS_MINIMUM) return { ready: false };
      return { ready: true, desk, trouble: tally(STUDY_RESULT_STEPS.trouble) };
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
          "SELECT house, weeks, join_pilot, later_email FROM study_pilot",
        )
        .all()
        .map((row) => ({
          house: row.house,
          weeks: JSON.parse(String(row.weeks)),
          joinPilot: row.join_pilot === 1,
          laterEmail: row.later_email === 1,
        }));
      return studyReportRowsSchema.parse({ sessions, answers, pilot });
    },
    close: () => db.close(),
  };
}
