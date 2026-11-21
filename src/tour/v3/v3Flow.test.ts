import assert from "node:assert/strict";
import test from "node:test";
import {
  STUDY_EVENTS_PER_SESSION,
  STUDY_V3_CORE_SCREENS,
  studyAnswerSchema,
  studyEventsSchema,
  studyStartSchema,
} from "../../../shared/study.ts";
import { TOUR_TEXT } from "../i18n/tourText.ts";
import {
  answerEvent,
  canGoBack,
  MIN_SECTION_FILL,
  nextV3,
  recordV3Answer,
  sectionFill,
  sectionStates,
  v3StepById,
  visibleV3Steps,
  withEvent,
  withoutAnswersOffPath,
  withV3Order,
} from "./v3Flow.ts";
import { eventJobs, v3Job } from "./v3Jobs.ts";
import type { V3Answer, V3Progress } from "./v3Progress.ts";
import {
  answerIds,
  DRAFT_ALLOCATION,
  DRAFT_DAY_STEP,
  DRAFT_DAYS,
  DRAFT_PRICES,
  DRAFT_VARIANTS,
  V3_SECTIONS,
  V3_STEPS,
  V3_VERSION,
  type V3ChoiceStep,
} from "./v3Script.ts";
import { optionsOf } from "./v3Words.ts";
import { sentPrice, sentResult } from "./draftResume.ts";
import { toggleOption } from "../optionOrder.ts";

const SESSION = "6f1c1f9e-5b7a-4c1e-9a1d-2f3b4c5d6e7f";

const answer = (...chosen: string[]): V3Answer => ({
  chosen,
  firstChosen: chosen,
  shown: [],
  text: "",
  elapsedMs: 0,
  revision: 1,
});

const progress: V3Progress = {
  session: SESSION,
  version: V3_VERSION,
  source: "friends",
  device: "phone",
  language: "en",
  stepId: "who",
  answers: {},
  orders: {},
  draftVariant: null,
  events: [],
  queuedEvents: 0,
  pilot: null,
  unsentDraft: null,
};

const ids = (answers: V3Progress["answers"]) =>
  visibleV3Steps(answers).map((step) => step.id);

const choiceSteps = (): V3ChoiceStep[] =>
  V3_STEPS.flatMap((step) => (step.kind === "choice" ? [step] : []));

const choiceStep = (id: string) => v3StepById(id) as V3ChoiceStep;

/** The obstacles of `last-trouble` offered after a role, as their ids. */
const troubleFor = (role: string) =>
  optionsOf(TOUR_TEXT.en, choiceStep("last-trouble"), {
    answers: { "last-role": answer(role) },
    orders: {},
  }).map((option) => option.id);

test("someone who tried answers the details; someone who never tried goes on to things at home", () => {
  const tried = ids({
    "last-role": answer("selling"),
    "last-outcome": answer("yes"),
  });
  for (const id of [
    "last-item",
    "last-occasion",
    "last-how",
    "last-outcome",
    "last-trouble",
    "last-transport",
    "last-messages",
  ])
    assert.ok(tried.includes(id), id);
  const none = ids({ "last-role": answer("none") });
  assert.ok(!none.includes("last-item"));
  assert.equal(none[none.indexOf("last-role") + 1], "part-home");
});

test("transport is asked only where something changed hands or still might", () => {
  const after = (outcome: string) =>
    ids({ "last-role": answer("buying"), "last-outcome": answer(outcome) });
  assert.ok(after("yes").includes("last-transport"));
  assert.ok(after("ongoing").includes("last-transport"));
  assert.ok(!after("no").includes("last-transport"));
});

test("the survey has 26 screens before the end after an attempt and 19 without", () => {
  const core = (answers: V3Progress["answers"]) => {
    const shown = ids(answers);
    return shown.slice(0, shown.indexOf("end")).length;
  };
  const idle = { "idle-items": answer("1-3"), "last-outcome": answer("yes") };
  assert.equal(core({ ...idle, "last-role": answer("buying") }), 26);
  assert.equal(core({ ...idle, "last-role": answer("none") }), 19);
  assert.equal(core({ "idle-items": answer("none") }), 18);
});

test("the steps follow the spec: two scenes, the request idea, the draft, then delegation", () => {
  const core = ids({ "idle-items": answer("4-10"), seeking: answer("yes") });
  assert.deepEqual(
    core.slice(core.indexOf("part-the-app") + 1, core.indexOf("part-price")),
    ["app-sell", "app-deal", "wanted-react", "seeking", "draft", "delegate"],
  );
  assert.deepEqual(core.slice(core.indexOf("part-price")), [
    "part-price",
    "pay-model",
    "age",
    "gender",
    "end",
  ]);
  assert.deepEqual(
    core.slice(core.indexOf("part-home"), core.indexOf("part-the-app")),
    ["part-home", "idle-items", "idle-why", "move"],
  );
});

test("the results page reads its funnel along the screens of the script", () => {
  assert.deepEqual(
    V3_STEPS.filter((step) => step.kind !== "end").map((step) => step.id),
    [...STUDY_V3_CORE_SCREENS],
  );
});

test("buyers see finding, gone and the price to agree; sellers see finding a taker, the listing and the price to set", () => {
  const shared = [
    "replies",
    "messages",
    "timing",
    "cancelled",
    "transport",
    "trust",
  ];
  const last = ["other", "nothing", "cant-recall"];
  assert.deepEqual(troubleFor("buying"), [
    "finding",
    "gone",
    "agree-price",
    ...shared,
    ...last,
  ]);
  assert.deepEqual(troubleFor("getting-free"), [
    "finding",
    "gone",
    ...shared,
    ...last,
  ]);
  assert.deepEqual(troubleFor("selling"), [
    "finding-taker",
    "deadline-pickup",
    "listing",
    "set-price",
    ...shared,
    ...last,
  ]);
  assert.deepEqual(troubleFor("giving-away"), [
    "finding-taker",
    "deadline-pickup",
    "listing",
    ...shared,
    ...last,
  ]);
  // The wire takes every role's list in a shown order.
  for (const role of ["buying", "getting-free", "selling", "giving-away"]) {
    const shown = { session: SESSION, step: "last-trouble", ...answer("x") };
    const sent = { ...shown, shown: troubleFor(role) };
    assert.ok(studyAnswerSchema.safeParse(sent).success, role);
  }
});

test("last-trouble shuffles within the role's options and keeps the last three below", () => {
  const trouble = v3StepById("last-trouble");
  const selling = {
    ...progress,
    answers: { "last-role": answer("selling") },
  };
  const ordered = withV3Order(selling, trouble, () => 0);
  assert.deepEqual(
    [...ordered.orders["last-trouble"]].sort(),
    [...troubleFor("selling")].sort(),
  );
  assert.deepEqual(ordered.orders["last-trouble"].slice(-3), [
    "other",
    "nothing",
    "cant-recall",
  ]);
  // The same role keeps the order; another role draws a new one among its own options.
  assert.equal(
    withV3Order(ordered, trouble, () => 0.5),
    ordered,
  );
  const buying = withV3Order(
    { ...ordered, answers: { "last-role": answer("buying") } },
    trouble,
    () => 0,
  );
  assert.deepEqual(
    [...buying.orders["last-trouble"]].sort(),
    [...troubleFor("buying")].sort(),
  );
});

test("an obstacle is emptied when another role changes the options; the same options keep it", () => {
  const before = {
    "last-role": answer("buying"),
    "last-trouble": answer("replies"),
  };
  const selling = withoutAnswersOffPath(before, {
    ...progress,
    answers: { ...before, "last-role": answer("selling") },
  });
  assert.deepEqual(selling.answers["last-trouble"].chosen, []);
  assert.deepEqual(selling.answers["last-trouble"].firstChosen, ["replies"]);
  assert.equal(selling.answers["last-trouble"].revision, 2);
  const sameOptions = {
    "last-role": answer("buying"),
    "last-trouble": answer("transport"),
  };
  const kept = withoutAnswersOffPath(sameOptions, {
    ...progress,
    answers: { ...sameOptions, "last-trouble": answer("timing") },
  });
  assert.deepEqual(kept.answers["last-trouble"].chosen, ["timing"]);
});

test("none of these clears the other tasks Pako may do, and is cleared by them", () => {
  const delegate = choiceStep("delegate");
  assert.equal(delegate.multiple, true);
  const options = optionsOf(TOUR_TEXT.en, delegate, progress);
  assert.deepEqual(toggleOption(options, ["remind", "negotiate"], "none"), [
    "none",
  ]);
  assert.deepEqual(toggleOption(options, ["none"], "remind"), ["remind"]);
});

test("the reasons for idle things are asked only of those who have some, as a multiple choice", () => {
  assert.ok(!ids({ "idle-items": answer("none") }).includes("idle-why"));
  for (const count of ["1-3", "4-10", "over-10"])
    assert.ok(ids({ "idle-items": answer(count) }).includes("idle-why"), count);
  assert.equal(choiceStep("idle-why").multiple, true);
});

test("saying yes to looking for something opens one optional line, named in every language", () => {
  for (const text of Object.values(TOUR_TEXT)) {
    const yes = optionsOf(text, choiceStep("seeking"), progress).find(
      (option) => option.id === "yes",
    );
    assert.equal(yes?.withText, true);
    assert.equal(yes?.textLine, text.v3.seekingWhat);
  }
});

test("everyone who finishes reaches the end; back stops before the first screen and at the end", () => {
  for (const role of ["buying", "none"])
    assert.equal(ids({ "last-role": answer(role) }).at(-1), "end", role);
  const steps = visibleV3Steps({});
  assert.equal(canGoBack(steps, v3StepById("part-last-time")), false);
  assert.equal(canGoBack(steps, v3StepById("end")), false);
  assert.equal(canGoBack(steps, v3StepById("draft")), true);
  assert.equal(canGoBack(steps, v3StepById("gender")), true);
  assert.equal(nextV3({}, "gender").id, "end");
});

test("the first answer stays when the step is answered again", () => {
  const first = recordV3Answer(
    { chosen: ["stays"], text: "" },
    [],
    undefined,
    900.4,
  );
  const again = recordV3Answer(
    { chosen: ["sent-now"], text: "" },
    [],
    first,
    100,
  );
  assert.deepEqual(again.firstChosen, ["stays"]);
  assert.equal(again.elapsedMs, 1000);
  assert.equal(answerEvent(again, first), "changed");
  assert.equal(answerEvent(first, undefined), "answered");
  assert.equal(answerEvent(answer(), undefined), "skipped");
  const decided = recordV3Answer(
    { chosen: ["sent-unchanged"], text: "Hi", firstChosen: ["send"] },
    [],
    undefined,
    0,
  );
  assert.deepEqual(decided.firstChosen, ["send"]);
});

test("shuffled steps keep their first order; the draft's days are stored under draft-day", () => {
  const payModel = v3StepById("pay-model");
  const shuffled = withV3Order(progress, payModel, () => 0);
  assert.equal(shuffled.orders["pay-model"].at(-1), "not-sure");
  assert.equal(
    withV3Order(shuffled, payModel, () => 0.9),
    shuffled,
  );
  const draft = withV3Order(progress, v3StepById("draft"), () => 0);
  assert.deepEqual([...draft.orders[DRAFT_DAY_STEP]].sort(), ["sat", "sun"]);
  assert.equal(withV3Order(progress, v3StepById("who")), progress);
  const wanted = withV3Order(progress, v3StepById("wanted-react"), () => 0);
  assert.deepEqual([...wanted.orders["wanted-react"]].sort(), [
    "leave",
    "offer-later",
    "offer-now",
    "rather-not",
  ]);
});

test("every option of every step has words in every language", () => {
  for (const text of Object.values(TOUR_TEXT))
    for (const step of choiceSteps()) {
      const labels: Record<string, string> = text.v3.steps[step.id].options;
      assert.deepEqual(Object.keys(labels), [...step.options], step.id);
      step.options.forEach((id) => assert.ok(labels[id], `${step.id} ${id}`));
    }
});

test("each of the four parts opens with its own screen, which stores no answer", () => {
  assert.equal(V3_SECTIONS.length, 4);
  for (const part of V3_SECTIONS) {
    const first = V3_STEPS.find((step) => step.section === part);
    assert.equal(first?.kind, "part", part);
    assert.deepEqual(answerIds(first), [], part);
  }
});

test("every way of paying is a card with its price and the same two facts, in every language", () => {
  const payModel = choiceStep("pay-model");
  for (const text of Object.values(TOUR_TEXT)) {
    const options = optionsOf(text, payModel, { answers: {}, orders: {} });
    for (const option of options) {
      if (option.id === "not-sure") {
        assert.equal(option.plan, undefined);
        continue;
      }
      assert.ok(option.plan?.price, option.id);
      assert.deepEqual(
        option.plan.facts.map((fact) => fact.label),
        [text.v3.plans.help, text.v3.plans.pay],
        option.id,
      );
      option.plan.facts.forEach((fact) => assert.ok(fact.value, option.id));
    }
  }
});

test("the current part fills over its longest path, from at least 0.15; finished parts are full", () => {
  const fill = (answers: V3Progress["answers"], id: string) =>
    sectionFill(answers, v3StepById(id));
  // Part 1 counts the whole tried path from the start: the part screen and ten questions.
  assert.equal(fill({}, "part-last-time"), MIN_SECTION_FILL);
  assert.equal(fill({}, "who"), MIN_SECTION_FILL);
  assert.equal(fill({}, "housing"), 2 / 11);
  assert.equal(fill({}, "last-role"), 3 / 11);
  const buying = { "last-role": answer("buying") };
  assert.equal(fill(buying, "last-messages"), 10 / 11);
  // A failed attempt skips transport, so the steps after it move forward, not back.
  const failed = { ...buying, "last-outcome": answer("no") };
  assert.equal(fill(buying, "last-outcome"), 7 / 11);
  assert.equal(fill(failed, "last-trouble"), 8 / 10);
  assert.equal(fill(failed, "last-messages"), 9 / 10);
  // Part 2 counts the reasons until someone says they have nothing idle.
  assert.equal(fill({}, "idle-items"), 1 / 4);
  assert.equal(fill({ "idle-items": answer("none") }, "move"), 2 / 3);
  assert.equal(fill({ "idle-items": answer("1-3") }, "move"), 3 / 4);
  assert.deepEqual(sectionStates(v3StepById("seeking")), {
    "last-time": "done",
    home: "done",
    "the-app": "current",
    price: "next",
  });
  assert.ok(
    Object.values(sectionStates(v3StepById("end"))).every(
      (state) => state === "done",
    ),
  );
});

test("the strip never goes back along any path forward", () => {
  const paths: V3Progress["answers"][] = [
    { "last-role": answer("buying"), "last-outcome": answer("yes") },
    { "last-role": answer("selling"), "last-outcome": answer("no") },
    { "last-role": answer("none"), "idle-items": answer("none") },
    { "last-role": answer("giving-away"), "idle-items": answer("over-10") },
  ];
  for (const answers of paths) {
    // Each step is reached with the answers given before it.
    const steps = visibleV3Steps(answers).filter((step) => step.section);
    let previous = { section: -1, fill: 0 };
    const given: V3Progress["answers"] = {};
    for (const step of steps) {
      const section = ["last-time", "home", "the-app", "price"].indexOf(
        step.section ?? "",
      );
      const now = sectionFill(given, step);
      if (section === previous.section)
        assert.ok(now >= previous.fill, `${step.id} after ${previous.fill}`);
      previous = { section, fill: now };
      if (answers[step.id]) given[step.id] = answers[step.id];
    }
  }
});

test("answers, events and the session are valid on the wire", () => {
  const start = {
    session: SESSION,
    survey: "v3",
    version: V3_VERSION,
    language: "fr",
    source: "fmel-vortex",
    device: "phone",
    consent: true,
  };
  assert.ok(studyStartSchema.safeParse(start).success);
  for (const step of V3_STEPS)
    for (const id of answerIds(step)) {
      const sent = { session: SESSION, step: id, ...answer("x"), elapsedMs: 0 };
      assert.ok(studyAnswerSchema.safeParse(sent).success, id);
    }
  for (const id of ["draft-day", "draft-variant", "draft-price"]) {
    const sent = {
      session: SESSION,
      step: id,
      ...answer("chf-45"),
      elapsedMs: 0,
    };
    assert.ok(studyAnswerSchema.safeParse(sent).success, id);
  }
  let recorded = progress;
  for (let index = 0; index < 45; index += 1)
    recorded = withEvent(recorded, "shown", "who", null, new Date(0));
  recorded = withEvent(recorded, "back", "housing", "move");
  const jobs = eventJobs(recorded);
  assert.deepEqual(
    jobs.map((job) => job.key),
    ["events-0-40", "events-40-46"],
  );
  const batch = { session: SESSION, events: recorded.events.slice(0, 40) };
  assert.ok(studyEventsSchema.safeParse(batch).success);
});

test("Mia confirms the agreed price and time; Pako's reply names the day and the variant's price, in every language", () => {
  assert.deepEqual(DRAFT_PRICES, { exact: 40, "wrong-price": 45 });
  for (const text of Object.values(TOUR_TEXT))
    for (const day of DRAFT_DAYS) {
      const words = text.v3.draft.days[day];
      const confirm = text.v3.draft.confirm(words, DRAFT_PRICES.exact);
      assert.ok(confirm.replace(/\s/g, " ").includes("CHF 40"), confirm);
      assert.match(confirm, /17[.:]30|17\s+h\s+30|5:30 pm/);
      assert.match(confirm, new RegExp(words, "i"));
      for (const variant of DRAFT_VARIANTS) {
        const offer = text.v3.draft.offer(words, DRAFT_PRICES[variant]);
        const label = `${day} ${variant} in ${text.v3.draft.chatLabel}`;
        assert.match(offer, new RegExp(words, "i"), label);
        assert.equal(sentPrice(offer), `chf-${DRAFT_PRICES[variant]}`, label);
      }
    }
});

test("two in three participants get the wrong price, drawn once when the task shows and kept", () => {
  assert.deepEqual(
    DRAFT_ALLOCATION.filter((variant) => variant === "wrong-price").length,
    2,
  );
  assert.equal(DRAFT_ALLOCATION.length, 3);
  const draft = v3StepById("draft");
  const variantAt = (draw: number) =>
    withV3Order(progress, draft, () => draw).draftVariant;
  assert.equal(variantAt(0), "exact");
  assert.equal(variantAt(0.34), "wrong-price");
  assert.equal(variantAt(0.99), "wrong-price");
  const exact = withV3Order(progress, draft, () => 0);
  assert.equal(withV3Order(exact, draft, () => 0.99).draftVariant, "exact");
  assert.equal(
    withV3Order(progress, v3StepById("delegate"), () => 0).draftVariant,
    null,
  );
});

test("the draft's variant is kept through a reload and stored with the day", async (t) => {
  const drawn = withV3Order(progress, v3StepById("draft"), () => 0.5);
  const reloaded = JSON.parse(JSON.stringify(drawn)) as V3Progress;
  assert.equal(
    withV3Order(reloaded, v3StepById("draft"), () => 0).draftVariant,
    "wrong-price",
  );
  const stored = {
    ...reloaded,
    answers: {
      "draft-variant": answer("wrong-price"),
      "draft-price": answer("chf-45"),
    },
  };
  const sent: { step: string; chosen: string[] }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 200 });
    },
  );
  await v3Job(stored, "draft-variant").send();
  await v3Job(stored, "draft-price").send();
  assert.deepEqual(
    sent.map(({ step, chosen }) => [step, chosen]),
    [
      ["draft-variant", ["wrong-price"]],
      ["draft-price", ["chf-45"]],
    ],
  );
});

test("the price sent is read from the message: one price, several, or none", () => {
  assert.equal(
    sentPrice("Great, thanks! So CHF 45, on Saturday at 5:30 pm."),
    "chf-45",
  );
  assert.equal(
    sentPrice("Abgemacht, CHF 40 am Samstag um 17.30 Uhr."),
    "chf-40",
  );
  assert.equal(sentPrice("Ok pour 40 francs samedi à 17 h 30"), "chf-40");
  assert.equal(sentPrice("40.- passt, bis 17.30"), "chf-40");
  assert.equal(sentPrice("Not CHF 45 but CHF 40, see you at 17:30"), "several");
  assert.equal(sentPrice("See you on Saturday at 17:30!"), "no-price");
});

test("a sent reply counts as unchanged only when it is the variant's own draft", () => {
  const text = TOUR_TEXT.en.v3.draft;
  for (const variant of DRAFT_VARIANTS) {
    const offer = text.offer(text.days.sat, DRAFT_PRICES[variant]);
    assert.equal(sentResult("change", offer, offer), "sent-unchanged", variant);
    assert.equal(sentResult("own", offer, offer), "sent-own", variant);
  }
  const wrong = text.offer(text.days.sat, DRAFT_PRICES["wrong-price"]);
  const corrected = text.offer(text.days.sat, DRAFT_PRICES.exact);
  assert.equal(sentResult("change", corrected, wrong), "sent-changed");
  assert.equal(sentResult("change", wrong, corrected), "sent-changed");
});

test("event batches are telemetry and stop at the server's limit per session", () => {
  let recorded = progress;
  for (let index = 0; index < STUDY_EVENTS_PER_SESSION + 10; index += 1)
    recorded = withEvent(recorded, "shown", "who", null, new Date(0));
  const near = eventJobs({ ...recorded, queuedEvents: 590 });
  assert.deepEqual(
    near.map((job) => [job.key, job.telemetry]),
    [["events-590-600", true]],
  );
  assert.deepEqual(
    eventJobs({ ...recorded, queuedEvents: STUDY_EVENTS_PER_SESSION }),
    [],
  );
});

test("going back from last-trouble and changing last-role to none empties the answers left behind", async (t) => {
  const tried: V3Progress = {
    ...progress,
    stepId: "last-role",
    answers: {
      who: answer("epfl"),
      "last-role": answer("buying"),
      "last-item": answer("furniture"),
      "last-occasion": answer("moving-in"),
      "last-trouble": {
        ...answer("transport"),
        shown: ["transport", "gone"],
        elapsedMs: 4000,
      },
    },
  };
  const none = recordV3Answer(
    { chosen: ["none"], text: "" },
    [],
    tried.answers["last-role"],
    500,
  );
  const changed = withoutAnswersOffPath(tried.answers, {
    ...tried,
    answers: { ...tried.answers, "last-role": none },
  });
  assert.equal(nextV3(changed.answers, "last-role").id, "part-home");
  assert.deepEqual(changed.answers["last-trouble"], {
    chosen: [],
    firstChosen: ["transport"],
    shown: ["transport", "gone"],
    text: "",
    elapsedMs: 4000,
    // Emptying is a new save, so it outranks the answer it replaces.
    revision: 2,
  });
  for (const id of ["last-item", "last-occasion"])
    assert.deepEqual(
      [changed.answers[id].chosen, changed.answers[id].text],
      [[], ""],
      id,
    );
  assert.equal(changed.answers.who, tried.answers.who);
  assert.deepEqual(changed.events, tried.events);

  const sent: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 200 });
    },
  );
  await v3Job(changed, "last-trouble").send();
  assert.deepEqual(sent, [
    {
      session: SESSION,
      step: "last-trouble",
      chosen: [],
      firstChosen: ["transport"],
      shown: ["transport", "gone"],
      text: "",
      elapsedMs: 4000,
      revision: 2,
    },
  ]);
});

test("a change that keeps the path and the options empties nothing", () => {
  const answers = {
    "last-role": answer("buying"),
    "last-item": answer("books"),
  };
  const changed = {
    ...progress,
    answers: { ...answers, "last-role": answer("selling") },
  };
  assert.deepEqual(
    withoutAnswersOffPath(answers, changed).answers,
    changed.answers,
  );
});

test("the start request names the wording version the session began in", async (t) => {
  const sent: { version: string }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 200 });
    },
  );
  await v3Job({ ...progress, version: "v3-2" }, "session").send();
  assert.equal(sent[0].version, "v3-2");
});
