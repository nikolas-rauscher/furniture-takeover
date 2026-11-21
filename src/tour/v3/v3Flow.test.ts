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
  backTarget,
  canGoBack,
  nextV3,
  recordV3Answer,
  sectionStates,
  v3StepById,
  visibleV3Steps,
  withEvent,
  withMoment,
  withoutAnswersOffPath,
  withV3Order,
} from "./v3Flow.ts";
import { eventJobs, v3Job } from "./v3Jobs.ts";
import type { V3Answer, V3Progress } from "./v3Progress.ts";
import {
  answerIds,
  DRAFT_DAY_STEP,
  DRAFT_DAYS,
  SITUATIONS,
  V3_STEPS,
  V3_VERSION,
  type V3ChoiceStep,
} from "./v3Script.ts";
import { optionsOf, questionOf } from "./v3Words.ts";
import { drawStart, ladderOf } from "./packPricing.ts";
import { toggleOption } from "../optionOrder.ts";

const SESSION = "6f1c1f9e-5b7a-4c1e-9a1d-2f3b4c5d6e7f";

const answer = (...chosen: string[]): V3Answer => ({
  chosen,
  firstChosen: chosen,
  shown: [],
  text: "",
  elapsedMs: 0,
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
  skippedFrom: null,
};

const ids = (answers: V3Progress["answers"]) =>
  visibleV3Steps(answers).map((step) => step.id);

const choiceSteps = (): V3ChoiceStep[] =>
  V3_STEPS.flatMap((step) => {
    if (step.kind === "choice") return [step];
    if (step.kind === "about") return [...step.rows];
    return [];
  });

test("someone who tried answers the details; someone who did not gets one reason", () => {
  const tried = ids({ "last-role": answer("selling") });
  assert.ok(tried.includes("last-trouble"));
  assert.ok(!tried.includes("why-not"));
  const none = ids({ "last-role": answer("none") });
  assert.ok(none.includes("why-not"));
  assert.ok(!none.includes("last-item"));
  assert.equal(none[none.indexOf("why-not") + 1], "move");
});

test("with the start screen, the core has 29 screens after an attempt and 25 without", () => {
  const core = (role: string) => {
    const shown = ids({ "last-role": answer(role) });
    return shown.slice(0, shown.indexOf("saved")).length;
  };
  assert.equal(core("buying") + 1, 29);
  assert.equal(core("none") + 1, 25);
});

test("the core shows each feature briefly, then asks whether it would have helped", () => {
  const core = ids({});
  assert.deepEqual(
    core.slice(core.indexOf("headline"), core.indexOf("move-it")),
    [
      "headline",
      "app-find",
      "helped-find",
      "app-sell",
      "helped-sell",
      "app-deal",
      "helped-deal",
      "stop",
      "try-first",
      "sending",
      "wanted-react",
      "wanted-share",
    ],
  );
  const brief = V3_STEPS.filter((step) => step.kind === "scene" && step.brief);
  assert.equal(brief.length, 3);
});

test("the results page reads its funnel along the core screens of the script", () => {
  const core = V3_STEPS.slice(
    0,
    V3_STEPS.findIndex((step) => step.kind === "saved"),
  );
  assert.deepEqual(
    core.map((step) => step.id),
    [...STUDY_V3_CORE_SCREENS],
  );
});

test("someone who never tried is asked whether a feature would help, not have helped", () => {
  const text = TOUR_TEXT.en;
  const helped = v3StepById("helped-sell") as V3ChoiceStep;
  const tried = { "last-role": answer("selling") };
  assert.equal(
    questionOf(text, helped, tried),
    text.v3.steps["helped-sell"].question,
  );
  assert.equal(
    questionOf(text, helped, { "last-role": answer("none") }),
    text.v3.helpedNeverTried,
  );
});

test("nothing would stop me clears the other obstacles", () => {
  const stop = v3StepById("stop") as V3ChoiceStep;
  const options = optionsOf(TOUR_TEXT.en, stop, progress);
  assert.deepEqual(toggleOption(options, ["privacy", "too-long"], "nothing"), [
    "nothing",
  ]);
  assert.deepEqual(toggleOption(options, ["nothing"], "privacy"), ["privacy"]);
});

test("the tour shows only after Peek, starting with the scene picked first", () => {
  assert.ok(!ids({}).includes("scene-pick"));
  const tour = ids({ peek: answer("tour"), "scene-pick": answer("find") });
  const scenes = tour.filter((id) => id.startsWith("tour-"));
  assert.deepEqual(scenes, ["tour-find", "tour-sell", "tour-deal"]);
  assert.equal(tour[tour.indexOf("tour-deal") + 1], "end");
});

test("only EPFL and UNIL students see the pilot form; students see their studies", () => {
  assert.ok(ids({ who: answer("unil") }).includes("pilot"));
  assert.ok(!ids({ who: answer("other-school") }).includes("pilot"));
  assert.ok(ids({ who: answer("other-school") }).includes("about-studies"));
  assert.ok(!ids({ who: answer("no") }).includes("about-studies"));
});

test("back stops before the first screen and after the core", () => {
  const steps = visibleV3Steps({});
  for (const id of ["what-is", "saved", "about-you", "end"])
    assert.equal(canGoBack(steps, v3StepById(id)), false, id);
  assert.equal(canGoBack(steps, v3StepById("draft")), true);
  assert.equal(canGoBack(steps, v3StepById("who")), true);
  assert.equal(nextV3({}, "delivery-pref").id, "saved");
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
  const headline = v3StepById("headline");
  const shuffled = withV3Order(progress, headline, () => 0);
  assert.equal(shuffled.orders.headline.at(-1), "none");
  assert.equal(
    withV3Order(shuffled, headline, () => 0.9),
    shuffled,
  );
  const draft = withV3Order(progress, v3StepById("draft"), () => 0);
  assert.deepEqual([...draft.orders[DRAFT_DAY_STEP]].sort(), ["sat", "sun"]);
  assert.equal(withV3Order(progress, v3StepById("who")), progress);
});

test("every option of every step has words in every language", () => {
  for (const text of Object.values(TOUR_TEXT))
    for (const step of choiceSteps()) {
      const options = optionsOf(text, step, { answers: {}, orders: {} });
      assert.equal(options.length, step.options.length, step.id);
      options.forEach((option) =>
        assert.ok(option.label, `${step.id} ${option.id}`),
      );
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

test("Pako's offer names the day the participant picked, in every language", () => {
  for (const text of Object.values(TOUR_TEXT))
    for (const day of DRAFT_DAYS) {
      const words = text.v3.draft.days[day];
      assert.match(
        text.v3.draft.offer(words),
        new RegExp(words, "i"),
        `${day} in ${text.v3.draft.chatLabel}`,
      );
    }
});

test("each situation opens with its place among the four", () => {
  const situations = V3_STEPS.filter((step) => step.situation !== undefined);
  assert.deepEqual(
    situations.map((step) => [step.id, step.situation]),
    [
      ["move-it", 1],
      ["desk", 2],
      ["draft", 3],
    ],
  );
  assert.equal(situations.length, SITUATIONS);
});

test("sections close in order and are all done after the core", () => {
  assert.deepEqual(sectionStates(v3StepById("headline")), {
    you: "done",
    "last-time": "done",
    "the-app": "current",
    situations: "next",
    price: "next",
  });
  assert.ok(
    Object.values(sectionStates(v3StepById("saved"))).every(
      (state) => state === "done",
    ),
  );
});

test("the pack ladder asks the next higher price after yes and the next lower after no", () => {
  assert.deepEqual(
    [0, 0.5, 0.99].map((r) => drawStart(() => r)),
    ["chf-2", "chf-5", "chf-8"],
  );
  const sheet = (start: string, answers: Record<string, string>) => ({
    orders: { "pack-price": [start] },
    answers: Object.fromEntries(
      Object.entries(answers).map(([id, chosen]) => [id, answer(chosen)]),
    ),
  });
  assert.equal(ladderOf(sheet("chf-5", {})).next, 5);
  assert.equal(ladderOf(sheet("chf-5", { "pack-chf-5": "yes" })).next, 8);
  assert.equal(ladderOf(sheet("chf-5", { "pack-chf-5": "no" })).next, 2);
  const done = ladderOf(
    sheet("chf-5", { "pack-chf-5": "yes", "pack-chf-8": "no" }),
  );
  assert.equal(done.next, null);
  assert.deepEqual(done.asked, [
    { price: 5, answer: "yes" },
    { price: 8, answer: "no" },
  ]);
  for (const [start, first] of [
    ["chf-8", "yes"],
    ["chf-2", "no"],
    ["chf-5", "not-sure"],
  ])
    assert.equal(
      ladderOf(sheet(start, { [`pack-chf-${start.slice(4)}`]: first })).next,
      null,
      `${start} ${first}`,
    );
});

test("delivery's worth is asked of everyone who would consider delivery", () => {
  assert.ok(
    !ids({ "delivery-pref": answer("pick-up") }).includes("delivery-worth"),
  );
  for (const choice of ["if-priced", "always", "depends"])
    assert.ok(
      ids({ "delivery-pref": answer(choice) }).includes("delivery-worth"),
    );
  assert.ok(ids({ "last-role": answer("selling") }).includes("last-cost"));
  assert.ok(!ids({ "last-role": answer("none") }).includes("last-cost"));
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

test("a scene's key moments are recorded on its first play, not on replays", () => {
  const tapped = withMoment(progress, "tour-sell", 2, "visitor", false);
  const auto = withMoment(tapped, "tour-sell", 4, "scene", false);
  assert.deepEqual(
    auto.events.map(({ kind, step, detail }) => [kind, step, detail]),
    [
      ["moment-tapped", "tour-sell", "moment-2"],
      ["moment-auto", "tour-sell", "moment-4"],
    ],
  );
  assert.equal(withMoment(auto, "tour-sell", 2, "visitor", true), auto);
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
      "last-story": { ...answer(), text: "The seller never answered." },
      "last-trouble": {
        ...answer("transport"),
        shown: ["transport", "price"],
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
  assert.equal(nextV3(changed.answers, "last-role").id, "why-not");
  assert.deepEqual(changed.answers["last-trouble"], {
    chosen: [],
    firstChosen: ["transport"],
    shown: ["transport", "price"],
    text: "",
    elapsedMs: 4000,
  });
  for (const id of ["last-item", "last-occasion", "last-story"])
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
      shown: ["transport", "price"],
      text: "",
      elapsedMs: 4000,
    },
  ]);
});

test("a change that keeps the path empties nothing", () => {
  const answers = {
    "last-role": answer("buying"),
    "last-trouble": answer("price"),
  };
  const selling = {
    ...progress,
    answers: { ...answers, "last-role": answer("selling") },
  };
  assert.deepEqual(
    withoutAnswersOffPath(answers, selling).answers,
    selling.answers,
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

test("Back after skipping the rest returns to the scene it was skipped from", () => {
  const touring: V3Progress = {
    ...progress,
    answers: {
      who: answer("epfl"),
      peek: answer("tour"),
      "scene-pick": answer("sell"),
    },
    stepId: "pilot",
  };
  assert.deepEqual(
    visibleV3Steps(touring.answers)
      .map((step) => step.id)
      .slice(-5),
    ["tour-sell", "tour-deal", "tour-find", "pilot", "end"],
  );
  assert.equal(
    backTarget({ ...touring, skippedFrom: "tour-sell" }).id,
    "tour-sell",
  );
  assert.equal(backTarget(touring).id, "tour-find");
  assert.equal(backTarget({ ...touring, stepId: "tour-deal" }).id, "tour-sell");
});
