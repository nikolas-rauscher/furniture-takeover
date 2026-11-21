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
  await choose(other, "last-hard", []);
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
      "helped-find": ["yes"],
      "helped-sell": ["partly"],
      "helped-deal": ["na"],
      stop: ["privacy", "nobody-nearby"],
      "try-first": ["photo-listing"],
      sending: { chosen: ["short-updates"], first: ["myself"] },
      "wanted-react": ["snap"],
      "wanted-share": ["yes"],
      "move-it": ["helper"],
      desk: ["nearer"],
      "last-cost": ["10-30"],
      "pack-chf-5": ["yes"],
      "pack-chf-8": ["no"],
      "pay-model": ["move-pack"],
      "institution-pay": ["yes"],
      "delivery-worth": ["11-20"],
      "draft-day": ["sat"],
      "draft-variant": ["wrong-price"],
      draft: { chosen: ["sent-changed"], first: ["change"] },
    },
    draftText: "Hi Mia! I can pick it up on Saturday at 17:30.",
    events: [
      ["shown", "who"],
      ["shown", "draft"],
      ["shown", "pack-chf-5"],
      ["shown", "pack-chf-8"],
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
      "helped-find": ["no"],
      "helped-sell": ["yes"],
      "helped-deal": ["no"],
      stop: ["nothing"],
      "try-first": ["none"],
      sending: ["myself"],
      "wanted-react": ["rather-not"],
      "wanted-share": ["no"],
      "move-it": ["carry-bike"],
      desk: ["cheaper"],
      "draft-variant": ["exact"],
      draft: { chosen: ["sent-own"], first: ["own"] },
      "pack-chf-5": ["no"],
      "pack-chf-2": ["yes"],
      "pay-model": ["free"],
      "delivery-worth": ["nothing"],
    },
    draftText: "Hi, is Sunday at 18:00 possible?",
    events: [
      ["shown", "who"],
      ["shown", "last-role"],
      ["shown", "pack-chf-5"],
      // Left after answering CHF 2, before the core was saved.
      ["shown", "pack-chf-2"],
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
      "select public.study_save_pilot($1,false,true,false,$2,'atrium')",
      [`${name}@epfl.ch`, role],
    );
  await db.query(
    "select public.study_save_pilot('flat@unil.ch',false,true,false,'seller','flat')",
  );
  await db.query(
    "select public.study_save_pilot('later@unil.ch',true,false,true,null,null)",
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
      ["pack-chf-5", 2, 0],
      ["who", 2, 0],
      ["draft", 1, 0],
      ["last-role", 1, 0],
      ["pack-chf-2", 1, 1],
      ["pack-chf-8", 1, 0],
      ["pilot", 1, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("split"), "option", "chosen", "answered"),
    [["hassle", 1, "1"]],
  );
  assert.deepEqual(
    rowsOf(
      await query("d1-places"),
      "place",
      "sellers",
      "buyers",
      "both_roles",
      "people",
      "meets_rule",
    ),
    [
      ["atrium", 2, 3, 1, 6, true],
      ["flat", 1, 0, 0, 1, false],
    ],
  );
  assert.deepEqual(await query("d1-forms"), [
    {
      form_shown: 1,
      forms: 8,
      launch_news: 1,
      try_early: 7,
      future_surveys: 1,
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
    rowsOf(
      await query("d3-transport"),
      "item",
      "subgroup",
      "option",
      "chosen",
      "answered",
    ),
    [
      ["delivery-worth", "all", "11-20", 1, "2"],
      ["delivery-worth", "all", "nothing", 1, "2"],
      ["delivery-worth", "furniture", "11-20", 1, "1"],
      ["delivery-worth", "rest", "nothing", 1, "1"],
      ["move-it", "all", "carry-bike", 1, "2"],
      ["move-it", "all", "helper", 1, "2"],
      ["move-it", "furniture", "helper", 1, "1"],
      ["move-it", "rest", "carry-bike", 1, "1"],
    ],
  );
  // Yes at CHF 2 counts the yes at CHF 5 too: both entered, both would pay CHF 2.
  assert.deepEqual(
    rowsOf(
      await query("d4-ladder"),
      "subgroup",
      "entered",
      "yes_2",
      "yes_5",
      "yes_8",
    ),
    [
      ["all", 2, 2, 1, 0],
      ["moving-by-june", 1, 1, 1, 0],
      ["rest", 1, 1, 0, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("d9-pay-model"),
      "subgroup",
      "model",
      "paid",
      "chosen",
      "answered",
      "paid_answered",
    ),
    [
      ["all", "move-pack", true, 1, "2", "1"],
      ["all", "free", false, 1, "2", "1"],
      ["epfl-unil", "move-pack", true, 1, "1", "1"],
      ["rest", "free", false, 1, "1", null],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("d5a-draft"),
      "variant",
      "final",
      "first",
      "participants",
      "completed_decisions",
      "shown_task",
    ),
    [
      ["exact", "sent-own", "own", 1, 1, 1],
      ["wrong-price", "sent-changed", "change", 1, 1, 1],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d5a-texts"), "variant", "final", "chosen_day", "text"),
    [
      [
        "wrong-price",
        "sent-changed",
        "sat",
        "Hi Mia! I can pick it up on Saturday at 17:30.",
      ],
      ["exact", "sent-own", null, "Hi, is Sunday at 18:00 possible?"],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d5b-sending"), "answer", "chosen", "answered"),
    [
      ["myself", 1, "2"],
      ["short-updates", 1, "2"],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("d7-helped"),
      "feature",
      "wording",
      "answer",
      "chosen",
      "answered",
    ),
    [
      ["helped-deal", "tried", "na", 1, "1"],
      ["helped-deal", "never-tried", "no", 1, "1"],
      ["helped-find", "tried", "yes", 1, "1"],
      ["helped-find", "never-tried", "no", 1, "1"],
      ["helped-sell", "tried", "partly", 1, "1"],
      ["helped-sell", "never-tried", "yes", 1, "1"],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d7-try-first"), "option", "feature", "chosen"),
    [
      ["photo-listing", true, 1],
      ["none", false, 1],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("d8-stop"), "option", "chosen", "answered"),
    [
      ["nobody-nearby", 1, 2],
      ["nothing", 1, 2],
      ["privacy", 1, 2],
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
      await query("d11-wanted"),
      "step",
      "subgroup",
      "answer",
      "chosen",
      "answered",
    ),
    [
      ["wanted-react", "all", "rather-not", 1, "2"],
      ["wanted-react", "all", "snap", 1, "2"],
      ["wanted-react", "fmel", "snap", 1, "1"],
      ["wanted-react", "rest", "rather-not", 1, "1"],
      ["wanted-share", "all", "no", 1, "2"],
      ["wanted-share", "all", "yes", 1, "2"],
      ["wanted-share", "fmel", "yes", 1, "1"],
      ["wanted-share", "rest", "no", 1, "1"],
    ],
  );
  assert.equal(queries.size, 19);

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

test("answers emptied by going back count as not answered in the v3 queries", async (t) => {
  const { db, run } = await database(t);
  await addParticipant(db, {
    source: "friends",
    device: "phone",
    answers: {
      who: ["epfl"],
      "last-role": { chosen: ["none"], first: ["buying"] },
      "last-item": { chosen: [], first: ["furniture"] },
      "last-trouble": { chosen: [], first: ["transport"] },
      "why-not": ["hassle"],
      "move-it": ["helper"],
    },
    events: [["shown", "who"]],
  });
  await addParticipant(db, {
    source: "poster-rlc",
    device: "desktop",
    answers: { age: [] },
    events: [["shown", "who"]],
  });
  const { queries } = await namedV3Queries();
  const query = async (name: string) => {
    const sql = queries.get(name);
    assert.ok(sql, `query ${name} is documented`);
    return run(sql);
  };
  assert.deepEqual(await query("d2-obstacles"), []);
  assert.deepEqual(
    rowsOf(
      await query("d3-transport"),
      "item",
      "subgroup",
      "option",
      "answered",
    ),
    [
      ["move-it", "all", "helper", "1"],
      ["move-it", "rest", "helper", "1"],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("funnel"), "source", "started", "answered_any").sort(),
    [
      ["friends", 1, 1],
      ["poster-rlc", 1, 0],
    ],
  );
});
