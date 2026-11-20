import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { studyDatabase } from "./supabase-fixture.ts";

/** The SQL blocks under "## Results queries" of a protocol file, in order. */
async function resultQueries(file: string) {
  const guide = await readFile(
    new URL(`../docs/${file}`, import.meta.url),
    "utf8",
  );
  const section = guide.slice(guide.indexOf("## Results queries"));
  return [...section.matchAll(/```sql\n([\s\S]*?)```/g)].map(
    (block) => block[1],
  );
}

/** v3 queries start with a `-- name` line; the deletion block has none. */
async function namedV3Queries() {
  const queries = new Map<string, string>();
  const unnamed: string[] = [];
  for (const sql of await resultQueries("STUDY.md")) {
    const name = /^-- ([a-z0-9-]+)\n/.exec(sql)?.[1];
    if (name) queries.set(name, sql);
    else unnamed.push(sql);
  }
  assert.equal(unnamed.length, 1, "only the deletion block is unnamed");
  return { queries, deletion: unnamed[0] };
}

async function database(t: TestContext) {
  const { db, asOwner } = await studyDatabase();
  t.after(() => db.close());
  const run = (sql: string) => asOwner<Record<string, unknown>>(sql);
  const count = async (table: string) =>
    (await run(`select count(*)::int as n from takeover_admin.${table}`))[0].n;
  return { db, run, count };
}

const runDeletion = async (
  run: (sql: string) => Promise<unknown>,
  deletion: string,
) => {
  for (const statement of deletion.trim().split(";\n")) await run(statement);
};

test("the v1 results queries run and count eligible participants", async (t) => {
  const { db, run } = await database(t);
  const eligible = randomUUID();
  const other = randomUUID();
  for (const session of [eligible, other])
    await db.query(
      "select public.study_start($1,'v1','pilot-1',null,'moodle','phone')",
      [session],
    );
  const choose = (session: string, step: string, chosen: string[]) =>
    db.query("select public.study_save_answer($1,$2,$3,null,'{}','',500)", [
      session,
      step,
      chosen,
    ]);
  await choose(eligible, "student", ["yes-epfl"]);
  await choose(eligible, "last-role", ["selling"]);
  await choose(eligible, "last-hard", ["price", "transport"]);
  await choose(eligible, "nearer-or-cheaper", ["nearer"]);
  await choose(eligible, "draft-check", ["send", "friday-kept"]);
  await choose(eligible, "need-soon", ["sell"]);
  await choose(other, "student", ["no"]);
  await db.query("select public.study_save_contact('ada@epfl.ch',true,$1)", [
    eligible,
  ]);

  const [participants, lastStep, options, tasks, contacts] =
    await resultQueries("STUDY-v1.md");
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
});

type Participant = {
  source: string;
  device: "phone" | "desktop";
  answers: Record<string, string[] | { chosen: string[]; first: string[] }>;
  draftText?: string;
  events: [kind: string, step: string | null][];
};

/** One participant who tried to sell furniture, and one who never tried. */
const PARTICIPANTS: Participant[] = [
  {
    source: "fmel-atrium",
    device: "phone",
    answers: {
      who: ["epfl"],
      "last-role": ["selling"],
      "last-item": ["furniture"],
      "last-trouble": ["transport"],
      move: ["move-feb"],
      housing: ["fmel"],
      headline: ["h-photo"],
      autonomy: ["no"],
      "who-sends": { chosen: ["stays"], first: ["sent-later"] },
      "move-it": ["helper"],
      desk: ["nearer"],
      pack: ["pack"],
      "draft-day": ["sat"],
      draft: { chosen: ["sent-edited"], first: ["edit"] },
    },
    draftText: "Hi Mia! I can pick it up on Saturday at 17:30.",
    events: [
      ["shown", "who"],
      ["shown", "draft"],
      ["core-complete", null],
      ["shown", "pilot"],
      ["end", null],
      ["share", null],
    ],
  },
  {
    source: "friend",
    device: "desktop",
    answers: {
      who: ["no"],
      "last-role": ["none"],
      "why-not": ["hassle"],
      move: ["no-plan"],
      housing: ["flat"],
      headline: ["none"],
      autonomy: ["yes"],
      "who-sends": ["stays"],
      "move-it": ["carry-bike"],
      desk: ["cheaper"],
      pack: ["manual"],
      draft: ["sent-unchanged"],
    },
    events: [
      ["shown", "who"],
      ["shown", "last-role"],
    ],
  },
];

async function addParticipant(
  db: Awaited<ReturnType<typeof studyDatabase>>["db"],
  participant: Participant,
  version = "v3-1",
) {
  const session = randomUUID();
  await db.query("select public.study_start($1,'v3',$2,'en',$3,$4)", [
    session,
    version,
    participant.source,
    participant.device,
  ]);
  for (const [step, answer] of Object.entries(participant.answers)) {
    const { chosen, first } = Array.isArray(answer)
      ? { chosen: answer, first: answer }
      : answer;
    const text = step === "draft" ? (participant.draftText ?? "") : "";
    await db.query("select public.study_save_answer($1,$2,$3,$4,'{}',$5,700)", [
      session,
      step,
      chosen,
      first,
      text,
    ]);
  }
  const events = participant.events.map(([kind, step], seq) => ({
    seq,
    kind,
    step,
    detail: null,
    at: "2026-11-30T10:00:00Z",
  }));
  await db.query("select public.study_save_events($1,$2::jsonb)", [
    session,
    JSON.stringify(events),
  ]);
}

async function addVolunteers(
  db: Awaited<ReturnType<typeof studyDatabase>>["db"],
) {
  const forms = [
    ["s1", "seller"],
    ["s2", "seller"],
    ["b1", "buyer"],
    ["b2", "buyer"],
    ["b3", "buyer"],
    ["x1", "both"],
  ] as const;
  for (const [name, role] of forms)
    await db.query(
      "select public.study_save_pilot($1,$2,'atrium','{2027-02-01}','{furniture}',true,false)",
      [`${name}@epfl.ch`, role],
    );
  await db.query(
    "select public.study_save_pilot('later@unil.ch','buyer','not-fmel','{}','{}',false,true)",
  );
}

const rowsOf = (rows: Record<string, unknown>[], ...columns: string[]) =>
  rows.map((row) => columns.map((column) => row[column]));

test("the v3 results queries run on v3 sessions of the named version only", async (t) => {
  const { db, run, count } = await database(t);
  for (const participant of PARTICIPANTS) await addParticipant(db, participant);
  await addParticipant(db, PARTICIPANTS[0], "v3-pilot");
  await db.query(
    "select public.study_start($1,'v1','v3-1',null,'moodle','phone')",
    [randomUUID()],
  );
  await addVolunteers(db);
  const { queries, deletion } = await namedV3Queries();
  const query = async (name: string) => {
    const sql = queries.get(name);
    assert.ok(sql, `query ${name} is documented`);
    return run(sql);
  };

  assert.deepEqual(
    rowsOf(
      await query("funnel"),
      "source",
      "started",
      "answered_any",
      "core_complete",
      "end_reached",
      "shared",
    ),
    [
      ["fmel-atrium", 1, 1, 1, 1, 1],
      ["friend", 1, 1, 0, 0, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("drop-off"), "step", "shown", "stopped_here"),
    [
      ["who", 2, 0],
      ["draft", 1, 0],
      ["last-role", 1, 1],
      ["pilot", 1, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("split"), "option", "chosen", "answered"),
    [["hassle", 1, "1"]],
  );
  assert.deepEqual(
    rowsOf(
      await query("d1-houses"),
      "house",
      "sellers",
      "buyers",
      "both_roles",
      "meets_rule",
    ),
    [["atrium", 2, 3, 1, true]],
  );
  assert.deepEqual(await query("d1-signups"), [
    {
      invitations_shown: 1,
      signed_up: 6,
      strong_interest: 6,
      later_email_only: 1,
    },
  ]);
  assert.deepEqual(
    rowsOf(await query("d1-move-housing"), "housing", "move", "participants"),
    [
      ["flat", "no-plan", 1],
      ["fmel", "move-feb", 1],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d1b-desk"), "subgroup", "option", "chosen", "answered"),
    [
      ["all", "cheaper", 1, "2"],
      ["all", "nearer", 1, "2"],
      ["fmel", "nearer", 1, "1"],
      ["rest", "cheaper", 1, "1"],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d2-obstacles"), "side", "option", "named", "chosen"),
    [
      ["all", "transport", true, 1],
      ["seller", "transport", true, 1],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d3-transport"), "subgroup", "option", "answered"),
    [
      ["all", "carry-bike", "2"],
      ["all", "helper", "2"],
      ["furniture", "helper", "1"],
      ["rest", "carry-bike", "1"],
    ],
  );
  assert.deepEqual(rowsOf(await query("d4-pack"), "subgroup", "option"), [
    ["all", "manual"],
    ["all", "pack"],
    ["moving-by-june", "pack"],
    ["rest", "manual"],
  ]);
  assert.deepEqual(
    rowsOf(
      await query("d5a-draft"),
      "final",
      "first",
      "participants",
      "completed_decisions",
      "shown_task",
    ),
    [
      ["sent-edited", "edit", 1, 2, 1],
      ["sent-unchanged", "sent-unchanged", 1, 2, 1],
    ],
  );
  assert.deepEqual(rowsOf(await query("d5a-texts"), "chosen_day", "text"), [
    ["sat", "Hi Mia! I can pick it up on Saturday at 17:30."],
  ]);
  assert.deepEqual(
    rowsOf(await query("d5bc"), "step", "answer", "chosen", "answered"),
    [
      ["autonomy", "no", 1, "2"],
      ["autonomy", "yes", 1, "2"],
      ["who-sends", "sent-later", 1, "2"],
      ["who-sends", "stays", 1, "2"],
    ],
  );
  assert.deepEqual(rowsOf(await query("d6-headline"), "subgroup", "option"), [
    ["all", "h-photo"],
    ["all", "none"],
    ["epfl-unil", "h-photo"],
    ["rest", "none"],
  ]);
  assert.deepEqual(
    rowsOf(
      await query("leak"),
      "shared_link",
      "completed_decisions",
      "sent_unchanged",
    ),
    [
      [false, 1, 0],
      [true, 1, 1],
    ],
  );
  assert.equal(queries.size, 15);

  await runDeletion(run, deletion);
  for (const table of [
    "study_sessions",
    "study_answers",
    "study_events",
    "study_pilot",
    "study_contacts",
  ])
    assert.equal(await count(table), 0);
});
