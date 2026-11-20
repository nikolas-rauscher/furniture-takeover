import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { studyDatabase } from "./supabase-fixture.ts";
import {
  STUDY_EVENT_KINDS,
  STUDY_LANGUAGES,
  STUDY_PILOT_HOUSES,
  STUDY_PILOT_ITEMS,
  STUDY_PILOT_ROLES,
  STUDY_PILOT_WEEKS,
  STUDY_RESULTS_MINIMUM,
  STUDY_SURVEYS,
  studyResultsSchema,
} from "../shared/study.ts";
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
  const savePilot = (email: string, role = "seller") =>
    db.query(
      "select public.study_save_pilot($1,$2,'atrium','{2027-02-01}','{furniture}',true,false)",
      [email, role],
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

test("a contact is stored once per address and unlinked when its session is deleted", async (t) => {
  const { asOwner, startSession, saveContact, count } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await saveContact("Ada@Epfl.ch");
  await saveContact(" ada@epfl.ch ", session);
  assert.equal(await count("study_contacts"), 1);
  await asOwner("delete from takeover_admin.study_sessions where id=$1", [
    session,
  ]);
  assert.deepEqual(
    await asOwner(
      "select email, pilot, session from takeover_admin.study_contacts",
    ),
    [{ email: "ada@epfl.ch", pilot: true, session: null }],
  );
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
  await saveContact("p1@epfl.ch");
  await assert.rejects(saveContact("new@epfl.ch"), /study_contact_limit/);
});

const STUDY_FUNCTIONS = [
  "public.study_start(gen_random_uuid(),'v3','p1','en','x','phone')",
  "public.study_save_answer(gen_random_uuid(),'who','{}','{}','{}','',0)",
  "public.study_save_events(gen_random_uuid(),'[]'::jsonb)",
  "public.study_save_contact('a@epfl.ch',true,null)",
  "public.study_save_pilot('a@epfl.ch','buyer','atrium','{}','{}',true,false)",
  "public.study_withdraw(gen_random_uuid())",
  "public.study_results()",
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

test("a pilot form is stored once per address, without a session, and capped", async (t) => {
  const { asOwner, savePilot, count } = await setup(t);
  await savePilot("Ada@Epfl.ch");
  await savePilot(" ada@epfl.ch ", "both");
  assert.deepEqual(
    await asOwner(
      "select email, role, weeks, items, join_pilot, later_email from takeover_admin.study_pilot",
    ),
    [
      {
        email: "ada@epfl.ch",
        role: "both",
        weeks: ["2027-02-01"],
        items: ["furniture"],
        join_pilot: true,
        later_email: false,
      },
    ],
  );
  await assert.rejects(savePilot("bo@unil.ch", "seller-buyer"), /check/);
  assert.deepEqual(
    await asOwner(
      `select column_name from information_schema.columns
       where table_schema='takeover_admin' and table_name='study_pilot' and column_name='session'`,
    ),
    [],
  );
  await asOwner(
    `insert into takeover_admin.study_pilot(email,role,house,weeks,items,join_pilot,later_email)
     select 'p'||n||'@epfl.ch','buyer','vortex','{}','{}',true,false from generate_series(2,$1) as n`,
    [STUDY_LIMITS.pilot],
  );
  assert.equal(await count("study_pilot"), STUDY_LIMITS.pilot);
  await savePilot("p2@epfl.ch");
  await assert.rejects(savePilot("new@epfl.ch"), /study_pilot_limit/);
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

test("shared results count v3 sessions only and appear from the minimum on", async (t) => {
  const { db, startSession, startV3, saveV3Answer } = await setup(t);
  const results = async () =>
    (await db.query<{ r: unknown }>("select public.study_results() as r"))
      .rows[0].r;
  const v1 = randomUUID();
  await startSession(v1);
  await db.query(
    "select public.study_save_answer($1,'desk','{cheaper}',null,'{}','',0)",
    [v1],
  );
  for (let n = 0; n < STUDY_RESULTS_MINIMUM; n++) {
    const session = randomUUID();
    await startV3(session);
    if (n > 0)
      await saveV3Answer(session, "desk", [n % 2 ? "nearer" : "neither"]);
    if (n < 3) await saveV3Answer(session, "last-trouble", ["price"]);
  }
  assert.deepEqual(await results(), { ready: false });
  const last = randomUUID();
  await startV3(last);
  await saveV3Answer(last, "desk", ["cheaper"]);
  assert.deepEqual(await results(), {
    ready: true,
    desk: {
      answered: STUDY_RESULTS_MINIMUM,
      options: [
        { option: "nearer", count: 10 },
        { option: "neither", count: 9 },
        { option: "cheaper", count: 1 },
      ],
    },
    trouble: { answered: 3, options: [{ option: "price", count: 3 }] },
  });
  assert.ok(studyResultsSchema.safeParse(await results()).success);
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
    for (const house of STUDY_PILOT_HOUSES)
      await db.query(
        "select public.study_save_pilot($1,$2,$3,$4,$5,true,true)",
        [
          `${role}-${house}@epfl.ch`,
          role,
          house,
          STUDY_PILOT_WEEKS,
          STUDY_PILOT_ITEMS,
        ],
      );
  assert.equal(await count("study_events"), STUDY_EVENT_KINDS.length);
  assert.equal(
    await count("study_pilot"),
    STUDY_PILOT_ROLES.length * STUDY_PILOT_HOUSES.length,
  );
});
