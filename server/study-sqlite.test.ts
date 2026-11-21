import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type StudyAnswer,
  type StudyContact,
  type StudyEvents,
  type StudyPilot,
  type StudyStart,
} from "../shared/study.ts";
import { createSqliteStudyStore } from "./study-sqlite.ts";
import { STUDY_LIMITS } from "./study-store.ts";

const v1Start = (session: string = randomUUID()): StudyStart => ({
  session,
  version: "p1",
  source: "moodle",
  device: "phone",
  consent: true,
});
const v3Start = (session: string = randomUUID()): StudyStart => ({
  ...v1Start(session),
  survey: "v3",
  version: "v3-1",
  language: "fr",
});
const answer = (session: string, step = "student"): StudyAnswer => ({
  session,
  step,
  chosen: ["epfl"],
  shown: [],
  text: "",
  elapsedMs: 1200,
});
const v3Answer = (
  session: string,
  step: string,
  chosen: string[],
): StudyAnswer => ({ ...answer(session, step), chosen, firstChosen: chosen });
const events = (session: string, seqs: number[]): StudyEvents => ({
  session,
  events: seqs.map((seq) => ({
    seq,
    kind: "shown",
    step: "who",
    detail: null,
    at: "2026-11-30T10:00:00.000Z",
  })),
});
const contact = (
  email: string,
  session: string | null = null,
): StudyContact => ({ email, pilot: false, session });
const pilot = (email: string): StudyPilot => ({
  email,
  launchNews: false,
  tryEarly: true,
  interview: false,
  futureSurveys: false,
  roles: ["sell"],
  place: "atrium",
  version: "v4-1",
});

async function withDatabase(run: (path: string) => void) {
  const directory = await mkdtemp(join(tmpdir(), "takeover-study-"));
  try {
    run(join(directory, "study.sqlite"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function rows(path: string, sql: string) {
  const db = new DatabaseSync(path);
  try {
    return db
      .prepare(sql)
      .all()
      .map((row) => ({ ...row }));
  } finally {
    db.close();
  }
}

test("starting a session twice keeps the first record", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const first = v1Start();
    store.start(first);
    store.start({ ...first, source: "slides", device: "desktop" });
    store.close?.();
    assert.deepEqual(
      rows(path, "SELECT id, source, device FROM study_sessions"),
      [{ id: first.session, source: "moodle", device: "phone" }],
    );
  });
});

test("a session stores its survey and language; a v1 request without them is a v1 session", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const v1 = randomUUID();
    const v3 = randomUUID();
    store.start(v1Start(v1));
    store.start(v3Start(v3));
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        `SELECT id, survey, language FROM study_sessions ORDER BY survey`,
      ),
      [
        { id: v1, survey: "v1", language: null },
        { id: v3, survey: "v3", language: "fr" },
      ],
    );
  });
});

test("an answer replaces the earlier answer for the same step", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v1Start();
    store.start(v1Start(session));
    store.saveAnswer(answer(session));
    store.saveAnswer({
      ...answer(session),
      chosen: ["unil", "x"],
      text: "later",
    });
    store.saveAnswer(answer(session, "housing"));
    store.close?.();
    assert.deepEqual(
      rows(path, "SELECT step, chosen, text FROM study_answers ORDER BY step"),
      [
        { step: "housing", chosen: '["epfl"]', text: "" },
        { step: "student", chosen: '["unil","x"]', text: "later" },
      ],
    );
  });
});

test("a v3 answer keeps its first answer when it is changed", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v3Start();
    store.start(v3Start(session));
    store.saveAnswer(v3Answer(session, "draft", ["edit"]));
    store.saveAnswer({
      ...v3Answer(session, "draft", ["edit", "send"]),
      firstChosen: ["send"],
    });
    store.close?.();
    assert.deepEqual(
      rows(path, "SELECT chosen, first_chosen FROM study_answers"),
      [{ chosen: '["edit","send"]', first_chosen: '["edit"]' }],
    );
  });
});

test("a first answer is required for v3 and refused for v1", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const v1 = randomUUID();
    const v3 = randomUUID();
    store.start(v1Start(v1));
    store.start(v3Start(v3));
    assert.throws(() => store.saveAnswer(answer(v3, "who")), {
      code: "STUDY_SURVEY_MISMATCH",
      status: 400,
    });
    assert.throws(() => store.saveAnswer(v3Answer(v1, "student", ["epfl"])), {
      code: "STUDY_SURVEY_MISMATCH",
    });
    store.close?.();
    assert.deepEqual(rows(path, "SELECT * FROM study_answers"), []);
  });
});

test("an answer, events or a linked contact for an unknown session are refused", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const unknown = randomUUID();
    for (const save of [
      () => store.saveAnswer(answer(unknown)),
      () => store.saveEvents(events(unknown, [0])),
      () => store.saveContact(contact("a@epfl.ch", unknown)),
    ])
      assert.throws(save, { code: "STUDY_SESSION_UNKNOWN", status: 404 });
    store.close?.();
    for (const table of ["study_answers", "study_events", "study_contacts"])
      assert.deepEqual(rows(path, `SELECT * FROM ${table}`), []);
  });
});

test("events are stored once per sequence number, so a resent batch adds nothing", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v3Start();
    store.start(v3Start(session));
    store.saveEvents(events(session, [0, 1]));
    store.saveEvents({
      session,
      events: [
        { ...events(session, [1]).events[0], kind: "back" },
        {
          seq: 2,
          kind: "back",
          step: "move",
          detail: "last-trouble",
          at: "2026-11-30T10:00:05.000Z",
        },
      ],
    });
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT seq, kind, step, detail FROM study_events ORDER BY seq",
      ),
      [
        { seq: 0, kind: "shown", step: "who", detail: null },
        { seq: 1, kind: "shown", step: "who", detail: null },
        { seq: 2, kind: "back", step: "move", detail: "last-trouble" },
      ],
    );
  });
});

test("events stop at the limit per session, and a refused batch stores none of its events", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v3Start();
    store.start(v3Start(session));
    const limit = STUDY_LIMITS.eventsPerSession;
    for (let seq = 0; seq < limit; seq += 40)
      store.saveEvents(
        events(
          session,
          Array.from({ length: Math.min(40, limit - seq) }, (_, n) => seq + n),
        ),
      );
    store.saveEvents(events(session, [0]));
    assert.throws(() => store.saveEvents(events(session, [limit])), {
      code: "STUDY_EVENT_LIMIT",
      status: 429,
    });
    store.close?.();
    assert.equal(rows(path, "SELECT seq FROM study_events").length, limit);
  });
});

test("a contact is stored once per address, and a later submission for it changes nothing", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v1Start();
    store.start(v1Start(session));
    store.saveContact({ ...contact("Ada@Epfl.ch", session), pilot: true });
    store.saveContact(contact("ada@epfl.ch"));
    store.saveContact(contact("bo@unil.ch"));
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT email, pilot, session FROM study_contacts ORDER BY email",
      ),
      [
        { email: "ada@epfl.ch", pilot: 1, session },
        { email: "bo@unil.ch", pilot: 0, session: null },
      ],
    );
  });
});

test("a form at the end is stored once per address, and a later form for it changes nothing", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    store.savePilot(pilot("Ada@Epfl.ch"));
    store.savePilot({
      ...pilot("ada@epfl.ch"),
      tryEarly: false,
      futureSurveys: true,
      roles: [],
      place: null,
    });
    store.savePilot({
      ...pilot("bo@unil.ch"),
      launchNews: true,
      tryEarly: false,
      interview: true,
      roles: [],
      place: null,
    });
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT email, launch_news, try_early, interview, future_surveys, roles, place FROM study_pilot ORDER BY email",
      ),
      [
        {
          email: "ada@epfl.ch",
          launch_news: 0,
          try_early: 1,
          interview: 0,
          future_surveys: 0,
          roles: '["sell"]',
          place: "atrium",
        },
        {
          email: "bo@unil.ch",
          launch_news: 1,
          try_early: 0,
          interview: 1,
          future_surveys: 0,
          roles: "[]",
          place: null,
        },
      ],
    );
  });
});

test("withdrawing removes the session with its answers and events, unlinks its contact and can be repeated", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v3Start();
    const other = randomUUID();
    store.start(v3Start(session));
    store.start(v3Start(other));
    store.saveAnswer(v3Answer(session, "who", ["epfl"]));
    store.saveEvents(events(session, [0]));
    store.saveEvents(events(other, [0]));
    store.saveContact(contact("ada@epfl.ch", session));
    store.withdraw({ session });
    store.withdraw({ session });
    store.close?.();
    assert.deepEqual(rows(path, "SELECT id FROM study_sessions"), [
      { id: other },
    ]);
    assert.deepEqual(rows(path, "SELECT * FROM study_answers"), []);
    assert.deepEqual(rows(path, "SELECT session FROM study_events"), [
      { session: other },
    ]);
    assert.deepEqual(rows(path, "SELECT session FROM study_contacts"), [
      { session: null },
    ]);
  });
});

test("an answer emptied by going back keeps its first answer and counts as not answered", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const emptied = randomUUID();
    const kept = randomUUID();
    store.start(v3Start(emptied));
    store.start(v3Start(kept));
    store.saveAnswer(v3Answer(kept, "last-trouble", ["timing"]));
    store.saveAnswer(v3Answer(emptied, "last-trouble", ["transport"]));
    store.saveAnswer({
      ...v3Answer(emptied, "last-trouble", []),
      firstChosen: ["transport"],
    });
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT chosen FROM study_answers WHERE step = 'last-trouble' ORDER BY chosen",
      ),
      [{ chosen: '["timing"]' }, { chosen: "[]" }],
    );
    assert.deepEqual(
      rows(
        path,
        `SELECT chosen, first_chosen, text FROM study_answers
         WHERE session = '${emptied}' AND step = 'last-trouble'`,
      ),
      [{ chosen: "[]", first_chosen: '["transport"]', text: "" }],
    );
  });
});

test("a demo file from v3 gets the interview tick, false for its forms, and roles from its role", async () => {
  await withDatabase((path) => {
    const db = new DatabaseSync(path);
    db.exec(`CREATE TABLE study_pilot (email TEXT PRIMARY KEY, launch_news INTEGER NOT NULL,
        try_early INTEGER NOT NULL, future_surveys INTEGER NOT NULL, role TEXT, place TEXT,
        created_at TEXT NOT NULL);
      INSERT INTO study_pilot VALUES ('old@epfl.ch', 1, 0, 0, NULL, NULL, '');
      INSERT INTO study_pilot VALUES ('both@epfl.ch', 0, 1, 0, 'both', 'flat', '');`);
    db.close();
    const store = createSqliteStudyStore(path);
    store.savePilot({ ...pilot("new@epfl.ch"), interview: true });
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT email, interview, roles FROM study_pilot ORDER BY email",
      ),
      [
        { email: "both@epfl.ch", interview: 0, roles: '["buy","sell"]' },
        { email: "new@epfl.ch", interview: 1, roles: '["sell"]' },
        { email: "old@epfl.ch", interview: 0, roles: "[]" },
      ],
    );
  });
});

test("a demo file from before v3 gets the new columns and keeps its sessions as v1", async () => {
  await withDatabase((path) => {
    const db = new DatabaseSync(path);
    db.exec(`CREATE TABLE study_sessions (id TEXT PRIMARY KEY, version TEXT NOT NULL,
        source TEXT NOT NULL, device TEXT NOT NULL, started_at TEXT NOT NULL);
      CREATE TABLE study_answers (session TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
        step TEXT NOT NULL, chosen TEXT NOT NULL, shown TEXT NOT NULL, text TEXT NOT NULL,
        elapsed_ms INTEGER NOT NULL, saved_at TEXT NOT NULL, PRIMARY KEY (session, step));
      INSERT INTO study_sessions VALUES ('old', 'pilot-1', 'moodle', 'phone', '');`);
    db.close();
    const store = createSqliteStudyStore(path);
    store.start(v3Start());
    store.close?.();
    assert.deepEqual(
      rows(path, "SELECT survey, language FROM study_sessions ORDER BY survey"),
      [
        { survey: "v1", language: null },
        { survey: "v3", language: "fr" },
      ],
    );
  });
});

test("answers, sessions, contacts and end forms stop at their limits; a full list refuses listed addresses too", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v1Start();
    store.start(v1Start(session));
    for (let step = 0; step < STUDY_LIMITS.answersPerSession; step++)
      store.saveAnswer(answer(session, `step-${step}`));
    store.saveAnswer(answer(session, "step-0"));
    assert.throws(() => store.saveAnswer(answer(session, "one-more")), {
      code: "STUDY_ANSWER_LIMIT",
    });
    store.close?.();

    const db = new DatabaseSync(path);
    db.exec("BEGIN");
    const insertSession = db.prepare(
      "INSERT INTO study_sessions (id, survey, version, source, device, started_at) VALUES (?, 'v1', 'p1', 'x', 'phone', '')",
    );
    for (let n = 1; n < STUDY_LIMITS.sessions; n++)
      insertSession.run(randomUUID());
    const insertContact = db.prepare(
      "INSERT INTO study_contacts (email, pilot, session, created_at) VALUES (?, 0, NULL, '')",
    );
    for (let n = 0; n < STUDY_LIMITS.contacts; n++)
      insertContact.run(`p${n}@epfl.ch`);
    const insertPilot = db.prepare(
      "INSERT INTO study_pilot (email, launch_news, try_early, future_surveys, created_at) VALUES (?, 1, 0, 0, '')",
    );
    for (let n = 0; n < STUDY_LIMITS.pilot; n++)
      insertPilot.run(`p${n}@epfl.ch`);
    db.exec("COMMIT");
    db.close();

    const full = createSqliteStudyStore(path);
    full.start(v1Start(session));
    assert.throws(() => full.start(v1Start()), {
      code: "STUDY_SESSION_LIMIT",
    });
    for (const email of ["p0@epfl.ch", "new@epfl.ch"]) {
      assert.throws(() => full.saveContact(contact(email)), {
        code: "STUDY_CONTACT_LIMIT",
      });
      assert.throws(() => full.savePilot(pilot(email)), {
        code: "STUDY_PILOT_LIMIT",
      });
    }
    full.close?.();
  });
});

test("a write in flight from before a reload never replaces the newer answer", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = v3Start();
    store.start(v3Start(session));
    // After the reload the sent offer (revision 2) arrives first...
    store.saveAnswer({
      ...v3Answer(session, "draft", ["sent-unchanged"]),
      firstChosen: ["change"],
      text: "Hi Mia!",
      revision: 2,
    });
    // ...then the unfinished "change" from before the reload (revision 1).
    store.saveAnswer({
      ...v3Answer(session, "draft", ["change"]),
      text: "",
      revision: 1,
    });
    // A retry of the newest write still lands.
    store.saveAnswer({
      ...v3Answer(session, "draft", ["sent-unchanged"]),
      firstChosen: ["change"],
      text: "Hi Mia!",
      revision: 2,
    });
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT chosen, first_chosen, text, revision FROM study_answers",
      ),
      [
        {
          chosen: '["sent-unchanged"]',
          first_chosen: '["change"]',
          text: "Hi Mia!",
          revision: 2,
        },
      ],
    );
  });
});
