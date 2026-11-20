import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StudyAnswer, StudyContact, StudyStart } from "../shared/study.ts";
import {
  STUDY_LIMITS,
  createSqliteStudyStore,
  createSupabaseStudyStore,
} from "./study-store.ts";

const start = (session: string = randomUUID()): StudyStart => ({
  session,
  version: "p1",
  source: "moodle",
  device: "phone",
  adult: true,
  consent: true,
});
const answer = (session: string, step = "student"): StudyAnswer => ({
  session,
  step,
  chosen: ["epfl"],
  shown: [],
  text: "",
  elapsedMs: 1200,
});
const contact = (
  email: string,
  session: string | null = null,
): StudyContact => ({ email, pilot: false, session });

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
    const first = start();
    store.start(first);
    store.start({ ...first, source: "slides", device: "desktop" });
    store.close?.();
    assert.deepEqual(
      rows(path, "SELECT id, source, device FROM study_sessions"),
      [{ id: first.session, source: "moodle", device: "phone" }],
    );
  });
});

test("an answer replaces the earlier answer for the same step", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = start();
    store.start(start(session));
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

test("an answer or a linked contact for an unknown session is refused", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const unknown = randomUUID();
    assert.throws(() => store.saveAnswer(answer(unknown)), {
      code: "STUDY_SESSION_UNKNOWN",
      status: 404,
    });
    assert.throws(() => store.saveContact(contact("a@epfl.ch", unknown)), {
      code: "STUDY_SESSION_UNKNOWN",
    });
    store.close?.();
    assert.deepEqual(rows(path, "SELECT * FROM study_answers"), []);
    assert.deepEqual(rows(path, "SELECT * FROM study_contacts"), []);
  });
});

test("a contact is stored once per address, with or without a session", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = start();
    store.start(start(session));
    store.saveContact(contact("Ada@Epfl.ch"));
    store.saveContact({ ...contact("ada@epfl.ch", session), pilot: true });
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

test("deleting a session removes its answers and unlinks its contact", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = start();
    store.start(start(session));
    store.saveAnswer(answer(session));
    store.saveContact(contact("ada@epfl.ch", session));
    store.close?.();
    const db = new DatabaseSync(path);
    db.exec("PRAGMA foreign_keys = ON");
    db.prepare("DELETE FROM study_sessions WHERE id = ?").run(session);
    assert.deepEqual(db.prepare("SELECT * FROM study_answers").all(), []);
    assert.equal(
      db.prepare("SELECT session FROM study_contacts").get()?.session,
      null,
    );
    db.close();
  });
});

test("answers, sessions and contacts stop at their limits; replacing an answer does not count", async () => {
  await withDatabase((path) => {
    const store = createSqliteStudyStore(path);
    const { session } = start();
    store.start(start(session));
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
      "INSERT INTO study_sessions (id, version, source, device, started_at) VALUES (?, 'p1', 'x', 'phone', '')",
    );
    for (let n = 1; n < STUDY_LIMITS.sessions; n++)
      insertSession.run(randomUUID());
    const insertContact = db.prepare(
      "INSERT INTO study_contacts (email, pilot, session, created_at) VALUES (?, 0, NULL, '')",
    );
    for (let n = 0; n < STUDY_LIMITS.contacts; n++)
      insertContact.run(`p${n}@epfl.ch`);
    db.exec("COMMIT");
    db.close();

    const full = createSqliteStudyStore(path);
    full.start(start(session));
    assert.throws(() => full.start(start()), { code: "STUDY_SESSION_LIMIT" });
    full.saveContact({ ...contact("p0@epfl.ch"), pilot: true });
    assert.throws(() => full.saveContact(contact("new@epfl.ch")), {
      code: "STUDY_CONTACT_LIMIT",
    });
    full.close?.();
  });
});

function fakeSupabase(t: TestContext, respond: () => Response | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const result = respond();
    if (result instanceof Error) throw result;
    return result;
  });
  return calls;
}
const failure = (message: string) =>
  Response.json({ code: "P0001", message }, { status: 400 });

test("the Supabase transport calls the study functions with the service key", async (t) => {
  const calls = fakeSupabase(t, () => new Response(null, { status: 204 }));
  const store = createSupabaseStudyStore("https://db.example", "sb_secret_x");
  const session = randomUUID();
  await store.start(start(session));
  await store.saveAnswer(answer(session));
  await store.saveContact(contact("ada@epfl.ch"));
  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      "https://db.example/rest/v1/rpc/study_start",
      "https://db.example/rest/v1/rpc/study_save_answer",
      "https://db.example/rest/v1/rpc/study_save_contact",
    ],
  );
  assert.equal(
    (calls[0].init.headers as Record<string, string>).apikey,
    "sb_secret_x",
  );
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    p_session: session,
    p_step: "student",
    p_chosen: ["epfl"],
    p_shown: [],
    p_text: "",
    p_elapsed_ms: 1200,
  });
  assert.deepEqual(JSON.parse(String(calls[2].init.body)), {
    p_email: "ada@epfl.ch",
    p_pilot: false,
    p_session: null,
  });
});

test("the Supabase transport turns named database errors into API errors", async (t) => {
  let message = "study_session_unknown";
  fakeSupabase(t, () => failure(message));
  const store = createSupabaseStudyStore("https://db.example", "sb_secret_x");
  for (const [name, code, status] of [
    ["study_session_unknown", "STUDY_SESSION_UNKNOWN", 404],
    ["study_answer_limit", "STUDY_ANSWER_LIMIT", 429],
    ["study_session_limit", "STUDY_SESSION_LIMIT", 429],
    ["study_contact_limit", "STUDY_CONTACT_LIMIT", 429],
  ] as const) {
    message = name;
    await assert.rejects(async () => store.saveAnswer(answer(randomUUID())), {
      code,
      status,
    });
  }
});

test("an unexpected Supabase failure is reported as unavailable without quoting stored values", async (t) => {
  fakeSupabase(t, () =>
    Response.json(
      { code: "23505", message: "duplicate key (email)=(ada@epfl.ch)" },
      { status: 409 },
    ),
  );
  const store = createSupabaseStudyStore("https://db.example", "sb_secret_x");
  await assert.rejects(
    async () => store.saveContact(contact("ada@epfl.ch")),
    (error) => {
      assert.equal((error as { code: string }).code, "STUDY_UNAVAILABLE");
      assert.doesNotMatch(String((error as Error).cause), /ada@epfl\.ch/);
      return true;
    },
  );
});

test("an unreachable Supabase project is reported as unavailable", async (t) => {
  fakeSupabase(t, () => new Error("connect ECONNREFUSED"));
  const store = createSupabaseStudyStore("https://db.example", "sb_secret_x");
  await assert.rejects(async () => store.start(start()), {
    code: "STUDY_UNAVAILABLE",
    status: 503,
  });
});
