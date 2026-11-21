import assert from "node:assert/strict";
import test from "node:test";
import { STUDY_REPORT_MIN_CELL } from "../shared/study.ts";
import { buildStudyReport, type StudyReportRows } from "./study-report.ts";

type Session = StudyReportRows["sessions"][number];

const session = (overrides: Partial<Session> = {}): Session => ({
  version: "v3-2",
  day: "2026-11-30",
  source: "moodle",
  shown: ["who", "last-role"],
  lastShown: "last-role",
  completed: true,
  ended: true,
  ...overrides,
});
const times = <Item>(count: number, item: () => Item) =>
  Array.from({ length: count }, item);

const rows = (overrides: Partial<StudyReportRows> = {}): StudyReportRows => ({
  sessions: [],
  answers: [],
  pilot: [],
  ...overrides,
});

test("counts between 1 and the minimum are hidden; zero and larger counts show", () => {
  const report = buildStudyReport(
    rows({
      sessions: [
        ...times(STUDY_REPORT_MIN_CELL, () => session()),
        ...times(2, () => session({ source: "fmel-vortex" })),
      ],
    }),
    null,
  );
  assert.equal(report.totals.started, STUDY_REPORT_MIN_CELL + 2);
  assert.deepEqual(report.sources, ["moodle", "fmel-vortex"]);
  assert.deepEqual(report.days[0].sources, [
    { source: "moodle", count: STUDY_REPORT_MIN_CELL },
    { source: "fmel-vortex", count: null },
  ]);
  const reached = Object.fromEntries(
    report.funnel.map(({ step, reached }) => [step, reached]),
  );
  assert.equal(reached.who, STUDY_REPORT_MIN_CELL + 2);
  assert.equal(reached.draft, 0);
});

test("the newest version is counted unless another is asked for", () => {
  const sessions = [
    session({ version: "v3-1", day: "2026-11-24" }),
    session({ version: "v3-2", day: "2026-11-30" }),
  ];
  assert.deepEqual(buildStudyReport(rows({ sessions }), null).versions, [
    "v3-2",
    "v3-1",
  ]);
  assert.equal(buildStudyReport(rows({ sessions }), "v3-1").totals.started, 1);
  assert.throws(() => buildStudyReport(rows({ sessions }), "v2"), /version/);
  assert.equal(buildStudyReport(rows(), null).version, null);
});

test("questions count chosen options over the participants who answered", () => {
  const answer = (step: string, chosen: string[], text = "") => ({
    version: "v3-2",
    step,
    chosen,
    text,
  });
  const report = buildStudyReport(
    rows({
      sessions: [session()],
      answers: [
        ...times(6, () => answer("stop", ["privacy", "too-long"])),
        answer("stop", ["other"], "Too far from my flat"),
        answer("stop", [], ""),
        answer("who", ["epfl"]),
        answer("draft", ["sent-unchanged"], "Hi Mia! Saturday"),
        answer("draft", ["sent-own"], "Hi, Saturday at 18:00?"),
        answer("last-story", [], "Sold it in a day"),
        answer("last-story", [], "Buyer never came"),
      ],
    }),
    null,
  );
  assert.deepEqual(
    report.questions.map(({ step }) => step),
    ["who", "stop", "draft"],
  );
  assert.deepEqual(report.questions[1], {
    step: "stop",
    answered: 7,
    options: [
      { option: "privacy", count: 6 },
      { option: "too-long", count: 6 },
      { option: "other", count: null },
    ],
  });
  assert.deepEqual(report.texts, [
    { step: "last-story", texts: ["Buyer never came", "Sold it in a day"] },
    { step: "stop", texts: ["Too far from my flat"] },
    { step: "draft", texts: ["Hi, Saturday at 18:00?"] },
  ]);
});

test("drop-off counts the last screen of sessions that did not finish the core", () => {
  const report = buildStudyReport(
    rows({
      sessions: [
        ...times(5, () => session({ completed: false, lastShown: "desk" })),
        session({ completed: false, lastShown: "move" }),
        session({ completed: false, lastShown: null }),
        session(),
      ],
    }),
    null,
  );
  assert.deepEqual(report.dropOff, [
    { step: "desk", count: 5 },
    { step: "move", count: null },
  ]);
  assert.equal(report.totals.completed, 1);
});

test("pilot sign-ups are counted per house and week", () => {
  const form = (house: "vortex" | "atrium", joinPilot = true) => ({
    house,
    weeks: ["2027-02-01" as const],
    joinPilot,
    laterEmail: true,
  });
  const { pilot } = buildStudyReport(
    rows({
      pilot: [
        ...times(5, () => form("vortex")),
        form("atrium"),
        form("atrium", false),
      ],
    }),
    null,
  );
  assert.deepEqual(
    {
      forms: pilot.forms,
      joinPilot: pilot.joinPilot,
      laterEmail: pilot.laterEmail,
    },
    { forms: 7, joinPilot: 6, laterEmail: 7 },
  );
  const vortex = pilot.houses.find(({ house }) => house === "vortex");
  assert.equal(vortex?.total, 5);
  assert.deepEqual(
    vortex?.weeks.find(({ week }) => week === "2027-02-01"),
    { week: "2027-02-01", count: 5 },
  );
  const atrium = pilot.houses.find(({ house }) => house === "atrium");
  assert.equal(atrium?.total, null);
});
