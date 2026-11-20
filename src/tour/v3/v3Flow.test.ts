import assert from "node:assert/strict";
import test from "node:test";
import {
  studyAnswerSchema,
  studyEventsSchema,
  studyStartSchema,
} from "../../../shared/study.ts";
import { TOUR_TEXT } from "../i18n/tourText.ts";
import {
  answerEvent,
  canGoBack,
  nextV3,
  recordV3Answer,
  sectionStates,
  v3StepById,
  visibleV3Steps,
  withEvent,
  withV3Order,
} from "./v3Flow.ts";
import { eventJobs } from "./v3Jobs.ts";
import type { V3Answer, V3Progress } from "./v3Progress.ts";
import {
  answerIds,
  DRAFT_DAY_STEP,
  V3_STEPS,
  V3_VERSION,
  type V3ChoiceStep,
} from "./v3Script.ts";
import { optionsOf } from "./v3Words.ts";

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
  source: "friends",
  device: "phone",
  language: "en",
  stepId: "who",
  answers: {},
  orders: {},
  events: [],
  queuedEvents: 0,
  pilot: null,
  withdrawn: false,
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

test("with the start screen, the core has 17 screens after an attempt and 14 without", () => {
  const core = (role: string) => {
    const shown = ids({ "last-role": answer(role) });
    return shown.slice(0, shown.indexOf("reveal") + 1).length;
  };
  assert.equal(core("buying") + 1, 17);
  assert.equal(core("none") + 1, 14);
});

test("the tour shows only after Peek, starting with the scene picked first", () => {
  assert.ok(!ids({}).includes("scene-pick"));
  const tour = ids({ peek: answer("tour"), "scene-pick": answer("find") });
  const scenes = tour.filter((id) => id.startsWith("tour-"));
  assert.deepEqual(scenes, ["tour-find", "tour-sell", "tour-deal"]);
  assert.equal(tour[tour.indexOf("tour-deal") + 1], "try-first");
});

test("only EPFL and UNIL students see the pilot form; students see their studies", () => {
  assert.ok(ids({ who: answer("unil") }).includes("pilot"));
  assert.ok(!ids({ who: answer("other-school") }).includes("pilot"));
  assert.ok(ids({ who: answer("other-school") }).includes("about-studies"));
  assert.ok(!ids({ who: answer("no") }).includes("about-studies"));
});

test("back stops before the first question, at the reveal and after the core", () => {
  const steps = visibleV3Steps({});
  for (const id of ["who", "reveal", "saved", "about-you", "end"])
    assert.equal(canGoBack(steps, v3StepById(id)), false, id);
  assert.equal(canGoBack(steps, v3StepById("draft")), true);
  assert.equal(nextV3({}, "draft").id, "reveal");
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
    adult: true,
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

test("nothing is recorded after the participant withdrew", () => {
  const withdrawn = { ...progress, withdrawn: true };
  assert.equal(withEvent(withdrawn, "shown", "who"), withdrawn);
});

test("sections close in order and are all done after the core", () => {
  assert.deepEqual(sectionStates(v3StepById("headline")), {
    you: "done",
    "last-time": "done",
    "first-look": "current",
    situations: "next",
  });
  assert.ok(
    Object.values(sectionStates(v3StepById("reveal"))).every(
      (state) => state === "done",
    ),
  );
});
