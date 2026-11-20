import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations } from "./supabase-fixture.ts";
import { STUDY_LIMITS } from "./study-store.ts";

async function setup(t: TestContext) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema takeover_admin;
    revoke all on schema takeover_admin from public, anon, authenticated;`);
  await applyMigrations(db, ["202611210001_study.sql"]);
  await db.exec("set role service_role");
  /** Reads and writes the tables as their owner, which students and the service role cannot. */
  const asOwner = async <T extends object = object>(
    sql: string,
    params: unknown[] = [],
  ) => {
    await db.exec("reset role");
    try {
      return (await db.query<T>(sql, params)).rows;
    } finally {
      await db.exec("set role service_role");
    }
  };
  const startSession = (session = randomUUID()) =>
    db.query("select public.study_start($1,'p1','moodle','phone')", [session]);
  const saveAnswer = (session: string, step = "student", text = "") =>
    db.query("select public.study_save_answer($1,$2,'{epfl}','{}',$3,1200)", [
      session,
      step,
      text,
    ]);
  const saveContact = (email: string, session: string | null = null) =>
    db.query("select public.study_save_contact($1,true,$2)", [email, session]);
  const count = async (table: string) =>
    (
      await asOwner<{ n: number }>(
        `select count(*)::int as n from takeover_admin.${table}`,
      )
    )[0].n;
  return { db, asOwner, startSession, saveAnswer, saveContact, count };
}

test("starting a session twice keeps the first record", async (t) => {
  const { db, asOwner, startSession } = await setup(t);
  const session = randomUUID();
  await startSession(session);
  await db.query("select public.study_start($1,'p2','slides','desktop')", [
    session,
  ]);
  assert.deepEqual(
    await asOwner(
      "select version, source, device from takeover_admin.study_sessions",
    ),
    [{ version: "p1", source: "moodle", device: "phone" }],
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
    "select public.study_save_answer($1,'step-'||n,'{}','{}','',0) from generate_series(1,$2) as n",
    [session, STUDY_LIMITS.answersPerSession],
  );
  await saveAnswer(session, "step-1");
  await assert.rejects(saveAnswer(session, "one-more"), /study_answer_limit/);

  await asOwner(
    `insert into takeover_admin.study_sessions(id,version,source,device)
     select gen_random_uuid(),'p1','x','phone' from generate_series(1,$1)`,
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

test("students cannot read the tables or call the functions", async (t) => {
  const { db, asOwner, startSession } = await setup(t);
  await startSession();
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role; set role ${role}`);
    await assert.rejects(
      db.query("select * from takeover_admin.study_sessions"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.study_start($1,'p1','x','phone')", [
        randomUUID(),
      ]),
      /permission denied/,
    );
  }
  await db.exec("set role service_role");
  const tables = await asOwner<{ rls: boolean }>(
    `select relrowsecurity as rls from pg_class
     where relnamespace='takeover_admin'::regnamespace and relname like 'study_%' and relkind='r'`,
  );
  assert.equal(tables.length, 3);
  assert.ok(tables.every(({ rls }) => rls));
  assert.deepEqual(
    await asOwner(
      "select 1 from pg_policies where schemaname='takeover_admin'",
    ),
    [],
  );
});

async function resultQueries() {
  const guide = await readFile(
    new URL("../docs/STUDY.md", import.meta.url),
    "utf8",
  );
  const section = guide.slice(guide.indexOf("## Results queries"));
  return [...section.matchAll(/```sql\n([\s\S]*?)```/g)].map(
    (block) => block[1],
  );
}

test("the results queries in the study protocol run and count eligible participants", async (t) => {
  const { db, asOwner, saveAnswer, saveContact, count } = await setup(t);
  const eligible = randomUUID();
  const other = randomUUID();
  for (const session of [eligible, other]) {
    await db.query("select public.study_start($1,'v1','moodle','phone')", [
      session,
    ]);
  }
  const choose = (session: string, step: string, chosen: string[]) =>
    db.query("select public.study_save_answer($1,$2,$3,'{}','',500)", [
      session,
      step,
      chosen,
    ]);
  await choose(eligible, "student", ["yes-epfl"]);
  await choose(eligible, "last-role", ["selling"]);
  await choose(eligible, "last-hard", ["price", "transport"]);
  await choose(eligible, "nearer-or-cheaper", ["nearer"]);
  await choose(eligible, "draft-check", ["send", "friday-kept"]);
  await choose(other, "student", ["no"]);
  await saveAnswer(eligible, "need-soon", "");
  await saveContact("ada@epfl.ch", eligible);

  const [participants, lastStep, options, tasks, contacts, deletion] =
    await resultQueries();
  const run = (sql: string) => asOwner<Record<string, unknown>>(sql);
  assert.deepEqual(await run(participants), [
    { source: "moodle", participants: 2, eligible: 1 },
  ]);
  assert.equal((await run(lastStep)).length, 2);
  assert.deepEqual(
    (await run(options)).map(({ option, chosen, answered }) => [
      option,
      chosen,
      answered,
    ]),
    [
      ["price", 1, 1],
      ["transport", 1, 1],
    ],
  );
  assert.deepEqual(
    (await run(tasks)).map(({ task, result }) => [task, result]),
    [
      ["C1", "nearer"],
      ["C2", "friday-kept"],
    ],
  );
  assert.deepEqual(
    (await run(contacts)).map(({ email, pilot, source }) => [
      email,
      pilot,
      source,
    ]),
    [["ada@epfl.ch", true, "moodle"]],
  );
  for (const statement of deletion.trim().split(";\n")) await run(statement);
  for (const table of ["study_sessions", "study_answers", "study_contacts"])
    assert.equal(await count(table), 0);
});
