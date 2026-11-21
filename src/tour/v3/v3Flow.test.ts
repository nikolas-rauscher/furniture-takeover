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
  amountOf,
  amountOption,
  amountsOf,
  answerIds,
  DRAFT_DAY_STEP,
  DRAFT_DAYS,
  DRAFT_PRICE,
  V3_SECTIONS,
  V3_STEPS,
  V3_VERSION,
  type V3AmountStep,
  type V3ChoiceStep,
} from "./v3Script.ts";
import { optionsOf } from "./v3Words.ts";
import { sentResult } from "./draftResume.ts";
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

test("the survey has 32 screens before the end after an attempt and 25 without", () => {
  const core = (answers: V3Progress["answers"]) => {
    const shown = ids(answers);
    return shown.slice(0, shown.indexOf("end")).length;
  };
  const idle = { "idle-items": answer("1-3"), "last-outcome": answer("yes") };
  assert.equal(core({ ...idle, "last-role": answer("buying") }), 32);
  assert.equal(core({ ...idle, "last-role": answer("none") }), 25);
  assert.equal(core({ "idle-items": answer("none") }), 24);
});

test("the steps follow the spec: personal parts first, then one story, then price and about you", () => {
  const core = ids({
    "last-role": answer("buying"),
    "last-outcome": answer("yes"),
    "idle-items": answer("4-10"),
    "idle-release": answer("yes"),
  });
  assert.deepEqual(core.slice(0, core.indexOf("part-home")), [
    "part-last-time",
    "last-role",
    "last-item",
    "last-occasion",
    "last-how",
    "last-outcome",
    "last-trouble",
    "last-transport",
    "last-messages",
  ]);
  assert.deepEqual(
    core.slice(core.indexOf("part-home"), core.indexOf("part-the-app")),
    [
      "part-home",
      "trade-frequency",
      "idle-items",
      "idle-release",
      "idle-why",
      "seeking",
    ],
  );
  assert.deepEqual(
    core.slice(core.indexOf("part-the-app") + 1, core.indexOf("part-price")),
    [
      "app-sell",
      "check-listing",
      "draft",
      "app-deal",
      "max-distance",
      "trust-signals",
      "delegate",
      "wanted-react",
    ],
  );
  assert.deepEqual(core.slice(core.indexOf("part-price")), [
    "part-price",
    "wtp-monthly",
    "pay-model",
    "pay-model-not",
    "pay-for",
    "who",
    "housing",
    "age",
    "gender",
    "end",
  ]);
});

test("the monthly amount runs from nothing to CHF 10 in steps of 50 rappen, stored as chf-<amount>", () => {
  const step = v3StepById("wtp-monthly") as V3AmountStep;
  const amounts = amountsOf(step);
  assert.equal(amounts.length, 21);
  assert.deepEqual([amounts[0], amounts[7], amounts.at(-1)], [0, 3.5, 10]);
  assert.deepEqual([0, 3.5, 10].map(amountOption), [
    "chf-0",
    "chf-3.5",
    "chf-10",
  ]);
  for (const amount of amounts) {
    assert.equal(amountOf(amountOption(amount)), amount);
    const sent = {
      session: SESSION,
      step: step.id,
      ...answer(amountOption(amount)),
    };
    assert.ok(studyAnswerSchema.safeParse(sent).success, String(amount));
  }
  assert.throws(() => amountOf("free"));
  for (const text of Object.values(TOUR_TEXT)) {
    const words = text.v3.amounts["wtp-monthly"];
    assert.ok(words.question && words.choose && words.nothing);
    assert.match(words.amount("3.50"), /CHF 3\.50/);
  }
});

test("pay-model-not offers the four plans with their pay-model words, may be skipped, and all-ok stands alone", () => {
  const not = choiceStep("pay-model-not");
  assert.equal(not.optional, true);
  assert.equal(not.exclusive, "all-ok");
  for (const text of Object.values(TOUR_TEXT))
    for (const id of ["free", "seller-fee", "pack-5", "monthly"]) {
      const plans: Record<string, string> = text.v3.steps["pay-model"].options;
      const nots: Record<string, string> =
        text.v3.steps["pay-model-not"].options;
      assert.equal(nots[id], plans[id], id);
    }
  const options = optionsOf(TOUR_TEXT.en, not, { answers: {}, orders: {} });
  assert.deepEqual(toggleOption(options, ["free", "monthly"], "all-ok"), [
    "all-ok",
  ]);
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
  const last = ["other", "cant-recall"];
  assert.deepEqual(troubleFor("buying"), [
    "nothing",
    "finding",
    "gone",
    "agree-price",
    ...shared,
    ...last,
  ]);
  assert.deepEqual(troubleFor("getting-free"), [
    "nothing",
    "finding",
    "gone",
    ...shared,
    ...last,
  ]);
  assert.deepEqual(troubleFor("selling"), [
    "nothing",
    "finding-taker",
    "deadline-pickup",
    "listing",
    "set-price",
    ...shared,
    ...last,
  ]);
  assert.deepEqual(troubleFor("giving-away"), [
    "nothing",
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

test("last-trouble keeps nothing first and other and can't remember last, and shuffles the obstacles between", () => {
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
  assert.equal(ordered.orders["last-trouble"][0], "nothing");
  assert.deepEqual(ordered.orders["last-trouble"].slice(-2), [
    "other",
    "cant-recall",
  ]);
  const drawn = (draw: number) =>
    withV3Order(selling, trouble, () => draw).orders["last-trouble"].join();
  assert.notEqual(drawn(0), drawn(0.99));
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

test("who has idle things says whether they would let them go; only yes or unsure gives reasons", () => {
  assert.ok(!ids({ "idle-items": answer("none") }).includes("idle-release"));
  for (const count of ["1-3", "4-10", "over-10"])
    assert.ok(
      ids({ "idle-items": answer(count) }).includes("idle-release"),
      count,
    );
  const reasons = (release: string) =>
    ids({ "idle-items": answer("1-3"), "idle-release": answer(release) });
  assert.ok(reasons("yes").includes("idle-why"));
  assert.ok(reasons("unsure").includes("idle-why"));
  assert.ok(!reasons("no").includes("idle-why"));
  // An answer left on idle-release decides nothing once there is nothing idle.
  assert.ok(
    !ids({
      "idle-items": answer("none"),
      "idle-release": answer("yes"),
    }).includes("idle-why"),
  );
  assert.equal(choiceStep("idle-why").multiple, true);
  assert.ok(choiceStep("idle-why").options.includes("keep"));
});

test("delegate keeps none of these first and shuffles the five permissions below it", () => {
  const delegate = v3StepById("delegate");
  for (const draw of [0, 0.5, 0.99]) {
    const order = withV3Order(progress, delegate, () => draw).orders.delegate;
    assert.equal(order[0], "none");
    assert.equal(order.length, 6);
  }
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

test("shuffled steps keep their first order; the draft's days keep the order of the week", () => {
  const payModel = v3StepById("pay-model");
  const shuffled = withV3Order(progress, payModel, () => 0);
  assert.equal(shuffled.orders["pay-model"].at(-1), "not-sure");
  assert.equal(
    withV3Order(shuffled, payModel, () => 0.9),
    shuffled,
  );
  const draft = withV3Order(progress, v3StepById("draft"), () => 0);
  assert.equal(draft.orders[DRAFT_DAY_STEP], undefined);
  assert.deepEqual(DRAFT_DAYS, ["sat", "sun"]);
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
  // Part 1 counts the whole tried path from the start: the part screen and eight questions.
  assert.equal(fill({}, "part-last-time"), MIN_SECTION_FILL);
  assert.equal(fill({}, "last-role"), MIN_SECTION_FILL);
  assert.equal(fill({}, "last-item"), 2 / 9);
  const buying = { "last-role": answer("buying") };
  assert.equal(fill(buying, "last-messages"), 8 / 9);
  // A failed attempt skips transport, so the steps after it move forward, not back.
  const failed = { ...buying, "last-outcome": answer("no") };
  assert.equal(fill(buying, "last-outcome"), 5 / 9);
  assert.equal(fill(buying, "last-trouble"), 6 / 9);
  assert.equal(fill(failed, "last-trouble"), 6 / 8);
  // Part 2 counts the release question and the reasons until an answer rules them out.
  assert.equal(fill({}, "idle-items"), 2 / 6);
  assert.equal(fill({ "idle-items": answer("none") }, "seeking"), 3 / 4);
  const idle = { "idle-items": answer("1-3") };
  assert.equal(fill(idle, "idle-release"), 3 / 6);
  assert.equal(
    fill({ ...idle, "idle-release": answer("no") }, "seeking"),
    4 / 5,
  );
  assert.equal(
    fill({ ...idle, "idle-release": answer("yes") }, "seeking"),
    5 / 6,
  );
  assert.deepEqual(sectionStates(v3StepById("delegate")), {
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
  const day = { session: SESSION, step: DRAFT_DAY_STEP, ...answer("sat") };
  assert.ok(studyAnswerSchema.safeParse(day).success);
  let recorded = progress;
  for (let index = 0; index < 45; index += 1)
    recorded = withEvent(recorded, "shown", "who", null, new Date(0));
  recorded = withEvent(recorded, "back", "housing", "who");
  const jobs = eventJobs(recorded);
  assert.deepEqual(
    jobs.map((job) => job.key),
    ["events-0-40", "events-40-46"],
  );
  const batch = { session: SESSION, events: recorded.events.slice(0, 40) };
  assert.ok(studyEventsSchema.safeParse(batch).success);
});

test("Léa confirms the agreed price and time; Pako's reply names the day and that price, in every language", () => {
  assert.equal(DRAFT_PRICE, 40);
  for (const text of Object.values(TOUR_TEXT))
    for (const day of DRAFT_DAYS) {
      const words = text.v3.draft.days[day];
      const confirm = text.v3.draft.confirm(words, DRAFT_PRICE);
      assert.ok(confirm.replace(/\s/g, " ").includes("CHF 40"), confirm);
      assert.match(confirm, /17[.:]30|17\s+h\s+30|5:30 pm/);
      assert.match(confirm, new RegExp(words, "i"));
      const offer = text.v3.draft.offer(words, DRAFT_PRICE);
      const label = `${day} in ${text.v3.draft.chatLabel}`;
      assert.match(offer, new RegExp(words, "i"), label);
      assert.ok(offer.replace(/\s/g, " ").includes("CHF 40"), label);
    }
});

test("the draft task draws nothing: every participant gets the same correct draft", () => {
  const draft = v3StepById("draft");
  assert.equal(
    withV3Order(progress, draft, () => 0.5),
    progress,
  );
});

test("a sent reply counts as unchanged only when it is Pako's draft", () => {
  const text = TOUR_TEXT.en.v3.draft;
  const offer = text.offer(text.days.sat, DRAFT_PRICE);
  assert.equal(sentResult("change", offer, offer), "sent-unchanged");
  assert.equal(sentResult("own", offer, offer), "sent-own");
  assert.equal(
    sentResult("change", `${offer} Thanks again!`, offer),
    "sent-changed",
  );
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
      "idle-items": answer("1-3"),
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
  assert.equal(changed.answers["idle-items"], tried.answers["idle-items"]);
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
