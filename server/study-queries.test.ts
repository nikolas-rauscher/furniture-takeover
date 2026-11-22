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

type Answer = string[] | { chosen: string[]; first?: string[]; text?: string };

type Participant = {
  source: string;
  device: "phone" | "desktop";
  answers: Record<string, Answer>;
  events: [kind: string, step: string | null][];
};

/** A seller who finished, a buyer who left at the draft, and one who never tried. */
const PARTICIPANTS: Participant[] = [
  {
    source: "fmel-atrium",
    device: "phone",
    answers: {
      who: ["epfl"],
      housing: ["fmel"],
      "last-role": ["selling", "buying"],
      "last-item": ["furniture"],
      "last-occasion": ["moving-out"],
      "last-how": ["chat-group"],
      "last-outcome": ["ongoing"],
      "last-trouble": ["set-price", "timing", "deadline-pickup"],
      "last-transport": ["not-yet"],
      "last-messages": ["8-12"],
      "trade-frequency": ["monthly"],
      "idle-items": ["4-10"],
      "idle-release": ["yes"],
      "idle-why": ["listing-hassle", "transport"],
      seeking: { chosen: ["yes"], text: "A bike" },
      "check-listing": ["price", "photos"],
      "draft-day": ["sat"],
      draft: {
        chosen: ["sent-unchanged"],
        first: ["send"],
        text: "Great, thanks! So CHF 40, on Saturday at 5:30 pm at the Rolex Learning Center. See you then!",
      },
      "max-distance": ["1-3"],
      "trust-signals": ["verified", "pako-rating"],
      delegate: ["answer-questions", "suggest-time"],
      "wanted-react": ["offer-now"],
      "wtp-monthly": ["chf-3.5"],
      "pay-model": ["credits", "free-ads", "monthly", "free", "seller-fee"],
      "pay-for": ["listings", "replies"],
      age: ["21-23"],
      gender: ["woman"],
    },
    events: [
      ["shown", "part-last-time"],
      ["shown", "draft"],
      ["shown", "end"],
      ["core-complete", null],
      ["end", null],
      ["share", null],
    ],
  },
  {
    source: "friend",
    device: "desktop",
    answers: {
      who: ["no"],
      housing: ["flat"],
      "last-role": ["buying"],
      "last-item": ["books"],
      "last-occasion": ["no-move"],
      "last-how": ["facebook"],
      "last-outcome": ["yes"],
      "last-trouble": ["finding"],
      "last-transport": ["foot"],
      "last-messages": ["1-3"],
      "trade-frequency": ["yearly"],
      "idle-items": ["1-3"],
      "idle-release": ["unsure"],
      "idle-why": ["might-need", "keep"],
      seeking: ["no"],
      draft: {
        chosen: ["sent-changed"],
        first: ["change"],
        text: "Great, thanks! So CHF 40, on Sunday at 6 pm.",
      },
      delegate: ["none"],
      "wanted-react": ["rather-not"],
      "wtp-monthly": ["chf-0"],
      "pay-model": ["free-ads", "free", "credits", "seller-fee", "monthly"],
    },
    events: [
      ["shown", "part-last-time"],
      ["shown", "last-role"],
      // Left at the draft, before the end.
      ["shown", "draft"],
    ],
  },
  {
    source: "poster-rlc",
    device: "phone",
    answers: {
      who: ["unil"],
      "last-role": ["none"],
      "idle-items": ["none"],
      seeking: { chosen: ["yes"], text: "A desk lamp" },
      draft: {
        chosen: ["sent-own"],
        first: ["own"],
        text: "Hi Léa, CHF 40 on Saturday works.",
      },
      delegate: ["remind"],
      "wanted-react": ["offer-later"],
      "wtp-monthly": ["chf-10"],
      "pay-model": ["monthly", "free", "credits", "seller-fee", "free-ads"],
      "pay-for": ["nothing"],
    },
    events: [
      ["shown", "who"],
      ["shown", "end"],
      ["core-complete", null],
      ["end", null],
    ],
  },
];

async function addParticipant(
  db: Awaited<ReturnType<typeof studyDatabase>>["db"],
  participant: Participant,
  version = "v4-3",
) {
  const session = randomUUID();
  await db.query("select public.study_start($1,'v3',$2,'en',$3,$4)", [
    session,
    version,
    participant.source,
    participant.device,
  ]);
  for (const [step, answer] of Object.entries(participant.answers)) {
    const {
      chosen,
      first = chosen,
      text = "",
    } = Array.isArray(answer) ? { chosen: answer } : answer;
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

/** Forms at the end: launch news, try early, interview, future surveys, roles, place. */
async function addVolunteers(
  db: Awaited<ReturnType<typeof studyDatabase>>["db"],
) {
  const forms = [
    ["s1", ["sell"]],
    ["s2", ["give-away"]],
    ["b1", ["buy"]],
    ["b2", ["get-free"]],
    ["b3", ["buy", "get-free"]],
    ["x1", ["buy", "sell"]],
    ["u1", ["not-sure"]],
  ] as const;
  for (const [name, roles] of forms)
    await db.query(
      "select public.study_save_pilot($1,false,true,false,false,$2,'atrium','v4-3')",
      [`${name}@epfl.ch`, roles],
    );
  await db.query(
    "select public.study_save_pilot('flat@unil.ch',false,true,true,false,'{sell}','flat','v4-3')",
  );
  await db.query(
    "select public.study_save_pilot('later@unil.ch',true,false,false,true,'{}',null,'v4-3')",
  );
  // A form of another wording version counts in neither rate nor places.
  await db.query(
    "select public.study_save_pilot('pilot@unil.ch',true,true,true,true,'{buy}','vortex','v3-pilot')",
  );
}

const rowsOf = (rows: Record<string, unknown>[], ...columns: string[]) =>
  rows.map((row) => columns.map((column) => row[column]));

/** The two-sided 95% Wilson lower bound, rounded as the queries round it. */
const wilsonLow = (k: number, n: number) => {
  const z = 1.96;
  const centre = (k + (z * z) / 2) / (n + z * z);
  const half = (z * Math.sqrt((k * (n - k)) / n + (z * z) / 4)) / (n + z * z);
  return Math.round((centre - half) * 1000) / 1000;
};

/** A rounded numeric column, which the driver returns as text. */
const numberOf = (value: unknown) => (value === null ? null : Number(value));

async function v4Queries() {
  const { queries, deletion } = await namedV3Queries();
  const query =
    (run: (sql: string) => Promise<Record<string, unknown>[]>) =>
    async (name: string) => {
      const sql = queries.get(name);
      assert.ok(sql, `query ${name} is documented`);
      return run(sql);
    };
  return { queries, deletion, query };
}

test("the v4 results queries run on the sessions of the named version only", async (t) => {
  const { db, run, count } = await database(t);
  for (const participant of PARTICIPANTS) await addParticipant(db, participant);
  await addParticipant(db, PARTICIPANTS[0], "v3-pilot");
  await db.query(
    "select public.study_start($1,'v1','v4-3',null,'moodle','phone')",
    [randomUUID()],
  );
  await addVolunteers(db);
  const { queries, deletion, query: queryWith } = await v4Queries();
  const query = queryWith(run);

  assert.deepEqual(
    rowsOf(
      await query("funnel"),
      "source",
      "device",
      "started",
      "answered_any",
      "core_complete",
      "end_reached",
      "shared",
    ).sort(),
    [
      ["fmel-atrium", "phone", 1, 1, 1, 1, 1],
      ["friend", "desktop", 1, 1, 0, 0, 0],
      ["poster-rlc", "phone", 1, 1, 1, 1, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("drop-off"), "step", "shown", "stopped_here"),
    [
      ["draft", 2, 1],
      ["end", 2, 0],
      ["part-last-time", 2, 0],
      ["last-role", 1, 0],
      ["who", 1, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("split"), "option", "chosen", "answered"),
    [
      ["epfl", 1, "3"],
      ["no", 1, "3"],
      ["unil", 1, "3"],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("rq1-coordination"),
      "side",
      "answered",
      "coordination",
      "finding_listing",
    ),
    [
      ["all", 2, 1, 1],
      ["both", 1, 1, 0],
      ["buying", 1, 0, 1],
    ],
  );
  assert.deepEqual(
    (await query("rq1-coordination")).map((row) =>
      numberOf(row.coordination_low),
    ),
    [wilsonLow(1, 2), wilsonLow(1, 1), wilsonLow(0, 1)],
  );
  assert.deepEqual(
    rowsOf(await query("rq1-context"), "step", "answer", "chosen", "answered"),
    [
      ["last-how", "chat-group", 1, "2"],
      ["last-how", "facebook", 1, "2"],
      ["last-messages", "1-3", 1, "2"],
      ["last-messages", "8-12", 1, "2"],
      ["last-outcome", "ongoing", 1, "2"],
      ["last-outcome", "yes", 1, "2"],
      ["last-transport", "foot", 1, "2"],
      ["last-transport", "not-yet", 1, "2"],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("rq2-idle"),
      "subgroup",
      "answered",
      "with_idle",
      "supply",
    ),
    [
      ["all", 3, 2, 1],
      ["monthly", 1, 1, 1],
      ["not-answered", 1, 0, 0],
      ["yearly", 1, 1, 0],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("rq2-reasons"),
      "option",
      "chosen",
      "participants",
      "effort_or_transport",
      "keeping",
    ),
    [
      ["keep", 1, 2, 1, 1],
      ["listing-hassle", 1, 2, 1, 1],
      ["might-need", 1, 2, 1, 1],
      ["transport", 1, 2, 1, 1],
    ],
  );
  assert.deepEqual(
    rowsOf(await query("rq3-wanted"), "step", "answer", "chosen", "answered"),
    [
      ["max-distance", "1-3", 1, "1"],
      ["seeking", "yes", 2, "3"],
      ["seeking", "no", 1, "3"],
      ["wanted-react", "offer-later", 1, "3"],
      ["wanted-react", "offer-now", 1, "3"],
      ["wanted-react", "rather-not", 1, "3"],
    ],
  );
  assert.deepEqual(rowsOf(await query("rq3-seeking-texts"), "text"), [
    ["A bike"],
    ["A desk lamp"],
  ]);
  const draft = await query("rq4-draft");
  assert.deepEqual(
    rowsOf(
      draft,
      "final",
      "first",
      "participants",
      "completed",
      "sends_draft",
      "shown_task",
    ),
    [
      ["sent-changed", "change", 1, 3, 2, 2],
      ["sent-own", "own", 1, 3, 2, 2],
      ["sent-unchanged", "send", 1, 3, 2, 2],
    ],
  );
  assert.equal(numberOf(draft[0].sends_draft_low), wilsonLow(2, 3));
  assert.deepEqual(rowsOf(await query("rq4-texts"), "final", "text").sort(), [
    ["sent-changed", "Great, thanks! So CHF 40, on Sunday at 6 pm."],
    ["sent-own", "Hi Léa, CHF 40 on Saturday works."],
  ]);
  assert.deepEqual(
    rowsOf(
      await query("multi"),
      "step",
      "option",
      "chosen",
      "participants",
      "any_but_exclusive",
    ),
    [
      ["check-listing", "photos", 1, 1, 1],
      ["check-listing", "price", 1, 1, 1],
      ["delegate", "answer-questions", 1, 3, 2],
      ["delegate", "none", 1, 3, 2],
      ["delegate", "remind", 1, 3, 2],
      ["delegate", "suggest-time", 1, 3, 2],
      ["idle-why", "keep", 1, 2, 2],
      ["idle-why", "listing-hassle", 1, 2, 2],
      ["idle-why", "might-need", 1, 2, 2],
      ["idle-why", "transport", 1, 2, 2],
      ["last-item", "books", 1, 2, 2],
      ["last-item", "furniture", 1, 2, 2],
      ["last-role", "buying", 2, 3, 2],
      ["last-role", "none", 1, 3, 2],
      ["last-role", "selling", 1, 3, 2],
      ["last-trouble", "deadline-pickup", 1, 2, 2],
      ["last-trouble", "finding", 1, 2, 2],
      ["last-trouble", "set-price", 1, 2, 2],
      ["last-trouble", "timing", 1, 2, 2],
      ["pay-for", "listings", 1, 2, 1],
      ["pay-for", "nothing", 1, 2, 1],
      ["pay-for", "replies", 1, 2, 1],
      ["trust-signals", "pako-rating", 1, 1, 1],
      ["trust-signals", "verified", 1, 1, 1],
    ],
  );
  assert.deepEqual(
    rowsOf(
      await query("rq5-wtp"),
      "side",
      "answered",
      "median",
      "q1",
      "q3",
      "nothing",
    ),
    [
      ["all", 3, 3.5, 1.75, 6.75, 1],
      ["both", 1, 3.5, 3.5, 3.5, 0],
      ["buying", 1, 0, 0, 0, 1],
      ["none", 1, 10, 10, 10, 0],
    ],
  );
  const ranks = await query("rq5-pay-model");
  assert.deepEqual(
    rowsOf(
      ranks.filter((row) => Number(row.rank) === 1),
      "side",
      "model",
      "chosen",
      "answered",
    ),
    [
      ["all", "credits", 1, "3"],
      ["all", "free-ads", 1, "3"],
      ["all", "monthly", 1, "3"],
      ["both", "credits", 1, "1"],
      ["buying", "free-ads", 1, "1"],
      ["none", "monthly", 1, "1"],
    ],
  );
  assert.deepEqual(
    rowsOf(
      ranks.filter((row) => row.side === "all" && Number(row.rank) === 2),
      "model",
      "chosen",
      "answered",
    ),
    [
      ["free", 2, "3"],
      ["free-ads", 1, "3"],
    ],
  );
  assert.deepEqual(await query("forms"), [
    {
      end_reached: 2,
      forms: 9,
      launch_news: 1,
      try_early: 8,
      interview: 1,
      future_surveys: 1,
    },
  ]);
  assert.deepEqual(
    rowsOf(
      await query("forms-places"),
      "place",
      "sellers",
      "buyers",
      "undecided",
      "people",
    ),
    [
      ["atrium", 3, 4, 1, 7],
      ["flat", 1, 0, 0, 1],
    ],
  );
  assert.equal(queries.size, 16);

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

test("answers emptied by going back count as not answered in the v4 queries", async (t) => {
  const { db, run } = await database(t);
  await addParticipant(db, {
    source: "friends",
    device: "phone",
    answers: {
      who: ["epfl"],
      "last-role": { chosen: ["none"], first: ["buying"] },
      "last-item": { chosen: [], first: ["furniture"] },
      "last-trouble": { chosen: [], first: ["transport"] },
      "idle-items": ["none"],
      "idle-why": { chosen: [], first: ["might-need"] },
    },
    events: [["shown", "who"]],
  });
  await addParticipant(db, {
    source: "poster-rlc",
    device: "desktop",
    answers: { age: [] },
    events: [["shown", "part-last-time"]],
  });
  const { query: queryWith } = await v4Queries();
  const query = queryWith(run);
  assert.deepEqual(
    rowsOf(
      await query("rq1-coordination"),
      "side",
      "answered",
      "coordination",
      "coordination_low",
    ),
    [["all", 0, 0, null]],
  );
  assert.deepEqual(await query("rq2-reasons"), []);
  assert.deepEqual(
    rowsOf(await query("rq2-idle"), "subgroup", "answered", "with_idle"),
    [
      ["all", 1, 0],
      ["not-answered", 1, 0],
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
