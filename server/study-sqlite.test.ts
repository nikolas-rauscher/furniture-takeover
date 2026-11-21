import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  STUDY_RESULTS_MINIMUM,
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
  role: "seller",
  house: "atrium",
  weeks: ["2027-02-01"],
  items: ["furniture", "bike"],
  joinPilot: true,
  laterEmail: false,
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

test("a pilot form is stored once per address, and a later form for it changes nothing", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    store.savePilot(pilot("Ada@Epfl.ch"));
    store.savePilot({
      ...pilot("ada@epfl.ch"),
      role: "both",
      weeks: [],
      joinPilot: false,
      laterEmail: true,
    });
    store.close?.();
    assert.deepEqual(
      rows(
        path,
        "SELECT email, role, house, weeks, items, join_pilot, later_email FROM study_pilot",
      ),
      [
        {
          email: "ada@epfl.ch",
          role: "seller",
          house: "atrium",
          weeks: '["2027-02-01"]',
          items: '["furniture","bike"]',
          join_pilot: 1,
          later_email: 0,
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

test("shared results appear once enough v3 participants of one wording version answered the desk task", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const v1 = randomUUID();
    store.start({ ...v1Start(v1), version: "v3-1" });
    store.saveAnswer({ ...answer(v1, "desk"), chosen: ["cheaper"] });
    const deskAnswers = (count: number, choice: string, version = "v3-1") => {
      for (let n = 0; n < count; n++) {
        const { session } = v3Start();
        store.start({ ...v3Start(session), version });
        store.saveAnswer(v3Answer(session, "desk", [choice]));
        if (n === 0)
          store.saveAnswer(v3Answer(session, "last-trouble", ["transport"]));
      }
    };
    deskAnswers(STUDY_RESULTS_MINIMUM, "cheaper", "v3-0");
    deskAnswers(STUDY_RESULTS_MINIMUM - 2, "nearer");
    deskAnswers(1, "neither");
    assert.deepEqual(store.results("v3-1"), { ready: false });
    deskAnswers(1, "cheaper");
    assert.deepEqual(store.results("v3-1"), {
      ready: true,
      desk: {
        answered: STUDY_RESULTS_MINIMUM,
        options: [
          { option: "nearer", count: STUDY_RESULTS_MINIMUM - 2 },
          { option: "cheaper", count: 1 },
          { option: "neither", count: 1 },
        ],
      },
      trouble: {
        answered: 3,
        options: [{ option: "transport", count: 3 }],
      },
    });
    assert.deepEqual(store.results("v3-0"), {
      ready: true,
      desk: {
        answered: STUDY_RESULTS_MINIMUM,
        options: [{ option: "cheaper", count: STUDY_RESULTS_MINIMUM }],
      },
      trouble: { answered: 1, options: [{ option: "transport", count: 1 }] },
    });
    assert.deepEqual(store.results("v3-9"), { ready: false });
    store.close?.();
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

test("answers, sessions, contacts and pilot forms stop at their limits; a full list refuses listed addresses too", async () => {
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
      "INSERT INTO study_pilot (email, role, house, weeks, items, join_pilot, later_email, created_at) VALUES (?, 'buyer', 'vortex', '[]', '[]', 1, 0, '')",
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
