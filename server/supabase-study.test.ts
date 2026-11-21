import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { applyMigrations, studyDatabase } from "./supabase-fixture.ts";
import {
  STUDY_EVENT_KINDS,
  STUDY_LANGUAGES,
  STUDY_PILOT_PLACES,
  STUDY_PILOT_ROLES,
  STUDY_SURVEYS,
} from "../shared/study.ts";
import { studyReportRowsSchema } from "./study-report.ts";
import { STUDY_LIMITS } from "./study-store.ts";

async function setup(t: TestContext) {
  const { db, asOwner } = await studyDatabase();
  t.after(() => db.close());
  const startSession = (session = randomUUID()) =>
    db.query("select public.study_start($1,'v1','p1',null,'moodle','phone')", [
      session,
    ]);
  const startV3 = (session = randomUUID()) =>
    db.query(
      "select public.study_start($1,'v3','v3-1','fr','moodle','phone')",
      [session],
    );
  const saveAnswer = (session: string, step = "student", text = "") =>
    db.query(
      "select public.study_save_answer($1,$2,'{epfl}',null,'{}',$3,1200)",
      [session, step, text],
    );
  const saveV3Answer = (
    session: string,
    step: string,
    chosen: string[],
    first: string[] | null = chosen,
  ) =>
    db.query("select public.study_save_answer($1,$2,$3,$4,'{}','',800)", [
      session,
      step,
      chosen,
      first,
    ]);
  const saveEvents = (session: string, seqs: number[], kind = "shown") =>
    db.query("select public.study_save_events($1,$2::jsonb)", [
      session,
      JSON.stringify(
        seqs.map((seq) => ({
          seq,
          kind,
          step: "who",
          detail: null,
          at: "2026-11-30T10:00:00Z",
        })),
      ),
    ]);
  const savePilot = (email: string, roles = ["sell"]) =>
    db.query(
      "select public.study_save_pilot($1,false,true,false,false,$2,'atrium')",
      [email, roles],
    );
  const saveContact = (email: string, session: string | null = null) =>
    db.query("select public.study_save_contact($1,true,$2)", [email, session]);
  const count = async (table: string) =>
    (
      await asOwner<{ n: number }>(
        `select count(*)::int as n from takeover_admin.${table}`,
      )
    )[0].n;
  return {
    db,
    asOwner,
    startSession,
    startV3,
    saveAnswer,
    saveV3Answer,
    saveEvents,
    savePilot,
    saveContact,
    count,
  };
}

test("starting a session twice keeps the first record", async (t) => {
  const { db, asOwner, startSession } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await db.query(
    "select public.study_start($1,'v3','p2','de','slides','desktop')",
    [session],
  );
  assert.deepEqual(
    await asOwner(
      "select survey, version, language, source, device from takeover_admin.study_sessions",
    ),
    [
      {
        survey: "v1",
        version: "p1",
        language: null,
        source: "moodle",
        device: "phone",
      },
    ],
  );
});

test("an answer replaces the earlier answer for its step", async (t) => {
  const { asOwner, startSession, saveAnswer, count } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await saveAnswer(session, "student", "first");
  await saveAnswer(session, "student", "second");
  await saveAnswer(session, "housing");
  assert.equal(await count("study_answers"), 2);
  assert.deepEqual(
    await asOwner(
      "select text from takeover_admin.study_answers where step='student'",
    ),
    [{ text: "second" }],
  );
});

test("an answer or linked contact for an unknown session is refused with a named error", async (t) => {
  const { saveAnswer, saveContact, count } = await setup(t);
  const unknown = randomUUID();
  await assert.rejects(saveAnswer(unknown), /study_session_unknown/);
  await assert.rejects(
    saveContact("ada@epfl.ch", unknown),
    /study_session_unknown/,
  );
  assert.equal(await count("study_answers"), 0);
  assert.equal(await count("study_contacts"), 0);
});

test("a contact is stored once per address, kept as first sent, and unlinked when its session is deleted", async (t) => {
  const { db, asOwner, startSession, saveContact, count } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await saveContact("Ada@Epfl.ch", session);
  await db.query("select public.study_save_contact($1,false,null)", [
    " ada@epfl.ch ",
  ]);
  assert.equal(await count("study_contacts"), 1);
  const contacts = () =>
    asOwner("select email, pilot, session from takeover_admin.study_contacts");
  assert.deepEqual(await contacts(), [
    { email: "ada@epfl.ch", pilot: true, session },
  ]);
  await asOwner("delete from takeover_admin.study_sessions where id=$1", [
    session,
  ]);
  assert.deepEqual(await contacts(), [
    { email: "ada@epfl.ch", pilot: true, session: null },
  ]);
});

test("deleting a session deletes its answers", async (t) => {
  const { asOwner, startSession, saveAnswer, count } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await saveAnswer(session);
  await asOwner("delete from takeover_admin.study_sessions where id=$1", [
    session,
  ]);
  assert.equal(await count("study_answers"), 0);
});

test("the limits on answers, sessions and contacts are enforced in SQL", async (t) => {
  const { db, asOwner, startSession, saveAnswer, saveContact } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await db.query(
    "select public.study_save_answer($1,'step-'||n,'{}',null,'{}','',0) from generate_series(1,$2) as n",
    [session, STUDY_LIMITS.answersPerSession],
  );
  await saveAnswer(session, "step-1");
  await assert.rejects(saveAnswer(session, "one-more"), /study_answer_limit/);

  await asOwner(
    `insert into takeover_admin.study_sessions(id,survey,version,source,device)
     select gen_random_uuid(),'v1','p1','x','phone' from generate_series(1,$1)`,
    [STUDY_LIMITS.sessions - 1],
  );
  await startSession(session);
  await assert.rejects(startSession(), /study_session_limit/);

  await asOwner(
    `insert into takeover_admin.study_contacts(email,pilot)
     select 'p'||n||'@epfl.ch',false from generate_series(1,$1) as n`,
    [STUDY_LIMITS.contacts],
  );
  for (const email of ["p1@epfl.ch", "new@epfl.ch"])
    await assert.rejects(saveContact(email), /study_contact_limit/);
});

const STUDY_FUNCTIONS = [
  "public.study_start(gen_random_uuid(),'v3','p1','en','x','phone')",
  "public.study_save_answer(gen_random_uuid(),'who','{}','{}','{}','',0)",
  "public.study_save_events(gen_random_uuid(),'[]'::jsonb)",
  "public.study_save_contact('a@epfl.ch',true,null)",
  "public.study_save_pilot('a@epfl.ch',true,false,false,false,null,null)",
  "public.study_withdraw(gen_random_uuid())",
  "public.study_report_rows(gen_random_uuid())",
];

test("students cannot read the tables or call the functions", async (t) => {
  const { db, asOwner, startSession } = await setup(t);
  await startSession();
  const tables = await asOwner<{ name: string; rls: boolean }>(
    `select relname as name, relrowsecurity as rls from pg_class
     where relnamespace='takeover_admin'::regnamespace and relname like 'study_%' and relkind='r'
     order by relname`,
  );
  assert.deepEqual(
    tables.map(({ name }) => name),
    [
      "study_answers",
      "study_contacts",
      "study_events",
      "study_pilot",
      "study_sessions",
    ],
  );
  assert.ok(tables.every(({ rls }) => rls));
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role; set role ${role}`);
    for (const { name } of tables)
      await assert.rejects(
        db.query(`select * from takeover_admin.${name}`),
        /permission denied/,
      );
    for (const call of STUDY_FUNCTIONS)
      await assert.rejects(db.query(`select ${call}`), /permission denied/);
  }
  await db.exec("set role service_role");
  assert.deepEqual(
    await asOwner(
      "select 1 from pg_policies where schemaname='takeover_admin'",
    ),
    [],
  );
  assert.deepEqual(
    await asOwner(
      `select p.proname from pg_proc p where p.pronamespace='public'::regnamespace
       and p.proname like 'study_%'
       and (not p.prosecdef or not ('search_path=""' = any(p.proconfig)))`,
    ),
    [],
    "every study function is security definer with an empty search path",
  );
});

test("a v3 answer keeps its first answer, and the survey decides whether one is needed", async (t) => {
  const { asOwner, startSession, startV3, saveV3Answer } = await setup(t);
  const v1 = randomUUID();
  const v3 = randomUUID();
  await startSession(v1);
  await startV3(v3);
  await saveV3Answer(v3, "draft", ["edit"]);
  await saveV3Answer(v3, "draft", ["edit", "send"], ["send"]);
  assert.deepEqual(
    await asOwner(
      "select chosen, first_chosen from takeover_admin.study_answers",
    ),
    [{ chosen: ["edit", "send"], first_chosen: ["edit"] }],
  );
  await assert.rejects(
    saveV3Answer(v3, "who", ["epfl"], null),
    /study_survey_mismatch/,
  );
  await assert.rejects(
    saveV3Answer(v1, "student", ["epfl"]),
    /study_survey_mismatch/,
  );
});

test("a v3 session without a language is refused by the table", async (t) => {
  const { db } = await setup(t);
  await assert.rejects(
    db.query(
      "select public.study_start($1,'v3','v3-1',null,'moodle','phone')",
      [randomUUID()],
    ),
    /check constraint/,
  );
});

test("events are stored once per sequence number, checked, and capped per session", async (t) => {
  const { asOwner, startV3, saveEvents, count } = await setup(t);
  const session = randomUUID();
  await startV3(session);
  await saveEvents(session, [0, 1]);
  await saveEvents(session, [1, 2], "back");
  assert.deepEqual(
    await asOwner(
      "select seq, kind from takeover_admin.study_events order by seq",
    ),
    [
      { seq: 0, kind: "shown" },
      { seq: 1, kind: "shown" },
      { seq: 2, kind: "back" },
    ],
  );
  await assert.rejects(
    saveEvents(session, [3], "scrolled"),
    /check constraint/,
  );
  await assert.rejects(saveEvents(session, []), /study_event_batch/);
  await assert.rejects(
    saveEvents(
      session,
      Array.from({ length: 41 }, (_, n) => 100 + n),
    ),
    /study_event_batch/,
  );
  await assert.rejects(saveEvents(randomUUID(), [0]), /study_session_unknown/);
  for (let seq = 3; seq < STUDY_LIMITS.eventsPerSession; seq += 40)
    await saveEvents(
      session,
      Array.from(
        { length: Math.min(40, STUDY_LIMITS.eventsPerSession - seq) },
        (_, n) => seq + n,
      ),
    );
  await assert.rejects(
    saveEvents(session, [STUDY_LIMITS.eventsPerSession]),
    /study_event_limit/,
  );
  assert.equal(await count("study_events"), STUDY_LIMITS.eventsPerSession);
});

test("a form at the end is stored once per address as first sent, without a session, and capped", async (t) => {
  const { db, asOwner, savePilot, count } = await setup(t);
  await savePilot("Ada@Epfl.ch");
  await savePilot(" ada@epfl.ch ", ["buy"]);
  assert.deepEqual(
    await asOwner(
      "select email, launch_news, try_early, interview, future_surveys, roles, place from takeover_admin.study_pilot",
    ),
    [
      {
        email: "ada@epfl.ch",
        launch_news: false,
        try_early: true,
        interview: false,
        future_surveys: false,
        roles: ["sell"],
        place: "atrium",
      },
    ],
  );
  await assert.rejects(savePilot("bo@unil.ch", ["seller"]), /check/);
  // Roles and place come with trying early and only with it; one tick is needed.
  for (const call of [
    "select public.study_save_pilot('cy@epfl.ch',true,true,false,false,'{}',null)",
    "select public.study_save_pilot('cy@epfl.ch',true,false,false,false,'{buy}','flat')",
    "select public.study_save_pilot('cy@epfl.ch',false,false,false,false,'{}',null)",
  ])
    await assert.rejects(db.query(call), /check/);
  // The interview tick alone is enough.
  await db.query(
    "select public.study_save_pilot('dee@epfl.ch',false,false,true,false,'{}',null)",
  );
  assert.equal(await count("study_pilot"), 2);
  assert.deepEqual(
    await asOwner(
      `select column_name from information_schema.columns
       where table_schema='takeover_admin' and table_name='study_pilot' and column_name='session'`,
    ),
    [],
  );
  await asOwner(
    `insert into takeover_admin.study_pilot(email,launch_news,try_early,future_surveys)
     select 'p'||n||'@epfl.ch',true,false,false from generate_series(3,$1) as n`,
    [STUDY_LIMITS.pilot],
  );
  assert.equal(await count("study_pilot"), STUDY_LIMITS.pilot);
  for (const email of ["p2@epfl.ch", "new@epfl.ch"])
    await assert.rejects(savePilot(email), /study_pilot_limit/);
});

test("withdrawing removes the session with its answers and events and can be repeated", async (t) => {
  const { db, startV3, saveV3Answer, saveEvents, count } = await setup(t);
  const session = randomUUID();
  await startV3(session);
  await startV3();
  await saveV3Answer(session, "who", ["epfl"]);
  await saveEvents(session, [0]);
  for (let attempt = 0; attempt < 2; attempt++)
    await db.query("select public.study_withdraw($1)", [session]);
  assert.equal(await count("study_sessions"), 1);
  assert.equal(await count("study_answers"), 0);
  assert.equal(await count("study_events"), 0);
});

test("an answer emptied by going back keeps its first answer", async (t) => {
  const { asOwner, startV3, saveV3Answer } = await setup(t);
  const emptied = randomUUID();
  await startV3(emptied);
  await saveV3Answer(emptied, "last-trouble", ["transport"]);
  await saveV3Answer(emptied, "last-trouble", [], ["transport"]);
  assert.deepEqual(
    await asOwner(
      "select chosen, first_chosen from takeover_admin.study_answers where session=$1 and step='last-trouble'",
      [emptied],
    ),
    [{ chosen: [], first_chosen: ["transport"] }],
  );
});

test("the tables accept every value the wire contract allows", async (t) => {
  const { db, count } = await setup(t);
  for (const survey of STUDY_SURVEYS)
    for (const language of STUDY_LANGUAGES)
      await db.query("select public.study_start($1,$2,'v3-1',$3,'x','phone')", [
        randomUUID(),
        survey,
        language,
      ]);
  const session = randomUUID();
  await db.query("select public.study_start($1,'v3','v3-1','en','x','phone')", [
    session,
  ]);
  await db.query("select public.study_save_events($1,$2::jsonb)", [
    session,
    JSON.stringify(
      STUDY_EVENT_KINDS.map((kind, seq) => ({
        seq,
        kind,
        step: null,
        detail: null,
        at: "2026-11-30T10:00:00Z",
      })),
    ),
  ]);
  for (const role of STUDY_PILOT_ROLES)
    for (const place of STUDY_PILOT_PLACES)
      await db.query(
        "select public.study_save_pilot($1,true,true,true,true,$2,$3)",
        [`${role}-${place}@epfl.ch`, [role], place],
      );
  assert.equal(await count("study_events"), STUDY_EVENT_KINDS.length);
  assert.equal(
    await count("study_pilot"),
    STUDY_PILOT_ROLES.length * STUDY_PILOT_PLACES.length,
  );
});

test("the results page rows are for admins and carry no session ids or emails", async (t) => {
  const { db, asOwner, startV3, saveV3Answer, saveEvents, savePilot } =
    await setup(t);
  const admin = randomUUID();
  await asOwner("insert into public.admins(user_id) values($1)", [admin]);
  const session = randomUUID();
  await startV3(session);
  await saveV3Answer(session, "who", ["epfl"]);
  await saveEvents(session, [0, 1]);
  await savePilot("ada@epfl.ch");
  await assert.rejects(
    db.query("select public.study_report_rows($1)", [randomUUID()]),
    /admin_required/,
  );
  const { rows } = await db.query<{ r: unknown }>(
    "select public.study_report_rows($1) as r",
    [admin],
  );
  const report = studyReportRowsSchema.parse(rows[0].r);
  assert.deepEqual(report.sessions, [
    {
      version: "v3-1",
      day: new Date().toISOString().slice(0, 10),
      source: "moodle",
      shown: ["who"],
      lastShown: "who",
      completed: false,
      ended: false,
    },
  ]);
  assert.deepEqual(report.answers, [
    { version: "v3-1", step: "who", chosen: ["epfl"], text: "" },
  ]);
  assert.deepEqual(report.pilot, [
    {
      launchNews: false,
      tryEarly: true,
      interview: false,
      futureSurveys: false,
      roles: ["sell"],
      place: "atrium",
    },
  ]);
  const body = JSON.stringify(rows[0].r);
  assert.ok(!body.includes(session) && !body.includes("ada@epfl.ch"));
});

test("a write in flight from before a reload never replaces the newer answer", async (t) => {
  const { db, asOwner, startV3 } = await setup(t);
  const session = randomUUID();
  await startV3(session);
  const save = (
    chosen: string[],
    first: string[],
    text: string,
    revision: number,
  ) =>
    db.query(
      "select public.study_save_answer($1,'draft',$2,$3,'{}',$4,900,$5)",
      [session, chosen, first, text, revision],
    );
  // After the reload the sent offer (revision 2) arrives first, then the unfinished
  // "change" from before the reload (revision 1); a retry of the newest still lands.
  await save(["sent-unchanged"], ["change"], "Hi Mia!", 2);
  await save(["change"], ["change"], "", 1);
  await save(["sent-unchanged"], ["change"], "Hi Mia!", 2);
  assert.deepEqual(
    await asOwner(
      "select chosen, first_chosen, text, revision from takeover_admin.study_answers",
    ),
    [
      {
        chosen: ["sent-unchanged"],
        first_chosen: ["change"],
        text: "Hi Mia!",
        revision: 2,
      },
    ],
  );
});

test("the v4 migration keeps earlier forms: no interview, roles from their role; v3's shared counts go", async () => {
  const { db, asOwner } = await studyDatabase(["202611210001_study.sql"]);
  try {
    await db.query(
      "select public.study_save_pilot('old@epfl.ch',true,false,false,null,null)",
    );
    for (const [email, role] of [
      ["sell@epfl.ch", "seller"],
      ["buy@epfl.ch", "buyer"],
      ["both@epfl.ch", "both"],
    ])
      await db.query(
        "select public.study_save_pilot($1,false,true,false,$2,'flat')",
        [email, role],
      );
    await db.exec("reset role");
    await applyMigrations(db, ["202611220002_study_v4.sql"]);
    await db.exec("set role service_role");
    assert.deepEqual(
      await asOwner(
        "select email, interview, roles from takeover_admin.study_pilot order by email",
      ),
      [
        { email: "both@epfl.ch", interview: false, roles: ["buy", "sell"] },
        { email: "buy@epfl.ch", interview: false, roles: ["buy"] },
        { email: "old@epfl.ch", interview: false, roles: [] },
        { email: "sell@epfl.ch", interview: false, roles: ["sell"] },
      ],
    );
    // A seller's list of obstacles is longer than v3 allowed.
    const session = "6f1c1f9e-5b7a-4c1e-9a1d-2f3b4c5d6e7f";
    await db.query(
      "select public.study_start($1,'v3','v4-1','en','x','phone')",
      [session],
    );
    const thirteen = Array.from({ length: 13 }, (_, n) => `o${n}`);
    await db.query(
      "select public.study_save_answer($1,'last-trouble','{o1}','{o1}',$2,'',0,1)",
      [session, thirteen],
    );
    assert.deepEqual(
      await asOwner(
        "select proname from pg_proc where proname in ('study_results','study_save_pilot')",
      ),
      [{ proname: "study_save_pilot" }],
    );
  } finally {
    await db.close();
  }
});
