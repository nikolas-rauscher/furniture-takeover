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
        ...times(6, () => answer("delegate", ["remind", "negotiate"])),
        answer("seeking", ["yes"], "A bike"),
        answer("delegate", [], ""),
        answer("who", ["epfl"]),
        answer("draft", ["sent-unchanged"], "Hi Léa! Saturday"),
        answer("draft", ["sent-own"], "Hi, Saturday at 18:00?"),
        answer("gender", ["self-describe"], "Agender"),
        answer("idle-items", ["1-3"]),
        answer("wtp-monthly", ["chf-3.5"]),
      ],
    }),
    null,
  );
  assert.deepEqual(
    report.questions.map(({ step }) => step),
    [
      "idle-items",
      "seeking",
      "draft",
      "delegate",
      "wtp-monthly",
      "who",
      "gender",
    ],
  );
  assert.deepEqual(report.questions[3], {
    step: "delegate",
    answered: 6,
    options: [
      { option: "negotiate", count: 6 },
      { option: "remind", count: 6 },
    ],
  });
  assert.deepEqual(report.texts, [
    { step: "seeking", texts: ["A bike"] },
    { step: "draft", texts: ["Hi, Saturday at 18:00?"] },
    { step: "gender", texts: ["Agender"] },
  ]);
});

test("drop-off counts the last screen of sessions that did not finish the core", () => {
  const report = buildStudyReport(
    rows({
      sessions: [
        ...times(5, () => session({ completed: false, lastShown: "draft" })),
        session({ completed: false, lastShown: "idle-why" }),
        session({ completed: false, lastShown: null }),
        session(),
      ],
    }),
    null,
  );
  assert.deepEqual(report.dropOff, [
    { step: "draft", count: 5 },
    { step: "idle-why", count: null },
  ]);
  assert.equal(report.totals.completed, 1);
});

test("the form at the end counts each tick; those who try early are counted per place and role", () => {
  type Form = StudyReportRows["pilot"][number];
  const form = (overrides: Partial<Form> = {}): Form => ({
    launchNews: true,
    tryEarly: false,
    interview: false,
    futureSurveys: false,
    roles: [],
    place: null,
    version: "v3-2",
    ...overrides,
  });
  const early = (place: Form["place"], roles: Form["roles"]) =>
    form({ tryEarly: true, place, roles });
  const { pilot } = buildStudyReport(
    rows({
      sessions: [session()],
      pilot: [
        // A form from another wording version is counted with that version only.
        form({ version: "v3-1" }),
        form({ version: null }),
        ...times(5, () => early("vortex", ["sell"])),
        early("vortex", ["get-free"]),
        early("flat", ["buy", "give-away"]),
        early("flat", ["not-sure"]),
        form({ launchNews: false, interview: true, futureSurveys: true }),
      ],
    }),
    null,
  );
  assert.deepEqual(
    {
      forms: pilot.forms,
      launchNews: pilot.launchNews,
      tryEarly: pilot.tryEarly,
      interview: pilot.interview,
      futureSurveys: pilot.futureSurveys,
    },
    { forms: 9, launchNews: 8, tryEarly: 8, interview: 1, futureSurveys: 1 },
  );
  assert.deepEqual(
    pilot.places.find(({ place }) => place === "vortex"),
    { place: "vortex", sellers: 5, buyers: null, undecided: 0 },
  );
  assert.deepEqual(
    pilot.places.find(({ place }) => place === "flat"),
    // One form who would buy and give away counts on both sides.
    { place: "flat", sellers: null, buyers: null, undecided: null },
  );
});

test("a question's denominator from 1 to the minimum is hidden like its counts", () => {
  const answer = (chosen: string) => ({
    version: "v3-2",
    step: "pack-chf-2",
    chosen: [chosen],
    text: "",
  });
  const few = buildStudyReport(
    rows({ sessions: [session()], answers: [answer("yes"), answer("no")] }),
    null,
  );
  assert.equal(few.questions[0].answered, null);
  const many = buildStudyReport(
    rows({
      sessions: [session()],
      answers: times(STUDY_REPORT_MIN_CELL, () => answer("no")),
    }),
    null,
  );
  assert.equal(many.questions[0].answered, STUDY_REPORT_MIN_CELL);
});

test("the ladder counts everyone who entered it, with the answers it implies", () => {
  const sessions = [
    ...times(6, () => session({ shown: ["pack-chf-5", "pack-chf-8"] })),
    ...times(5, () => session({ shown: ["pack-chf-5", "pack-chf-2"] })),
    // Left at CHF 5 without answering, and not sure at CHF 5.
    session({ shown: ["pack-chf-5"] }),
    session({ shown: ["pack-chf-5"] }),
  ];
  const answer = (step: string, chosen: string) => ({
    version: "v3-2",
    step,
    chosen: [chosen],
    text: "",
  });
  const { ladder } = buildStudyReport(
    rows({
      sessions,
      answers: [
        ...times(6, () => answer("pack-chf-5", "yes")),
        answer("pack-chf-8", "yes"),
        ...times(5, () => answer("pack-chf-8", "no")),
        ...times(5, () => answer("pack-chf-5", "no")),
        ...times(5, () => answer("pack-chf-2", "yes")),
        answer("pack-chf-5", "not-sure"),
      ],
    }),
    null,
  );
  // Thirteen entered. Yes at CHF 2: the 6 who said yes at 5, and 5 more at 2.
  assert.deepEqual(ladder, {
    entered: 13,
    prices: [
      { price: 2, yes: 11 },
      { price: 5, yes: 6 },
      { price: 8, yes: null },
    ],
  });
});

test("pricing rankings count each position and keep older single-choice results separate", () => {
  const plans = ["credits", "free-ads", "free", "seller-fee", "monthly"];
  const version = "v4-3";
  const reportRows = rows({
    sessions: [session({ version }), session({ version: "v4-2" })],
    answers: [
      ...times(5, () => ({
        version,
        step: "pay-model",
        chosen: plans,
        text: "",
      })),
      {
        version,
        step: "pay-model",
        chosen: [...plans].reverse(),
        text: "A day pass",
      },
      { version: "v4-2", step: "pay-model", chosen: ["pack-5"], text: "" },
    ],
  });
  const report = buildStudyReport(reportRows, version);
  assert.deepEqual(
    report.questions[0].options.filter((option) => option.rank === 1),
    [
      { option: "credits", rank: 1, count: 5 },
      { option: "monthly", rank: 1, count: null },
    ],
  );
  assert.deepEqual(report.texts[0].texts, ["A day pass"]);
  const earlier = buildStudyReport(reportRows, "v4-2");
  assert.deepEqual(earlier.questions[0].options, [
    { option: "pack-5", count: null },
  ]);
  const screens = earlier.funnel.map(({ step }) => step);
  assert.equal(screens[screens.indexOf("app-deal") + 1], "max-distance");
  assert.ok(screens.includes("pay-model-not"));
  assert.ok(!report.funnel.some(({ step }) => step === "pay-model-not"));
});
