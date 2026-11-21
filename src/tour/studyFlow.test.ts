import assert from "node:assert/strict";
import test from "node:test";
import {
  answersOffPath,
  isAnswered,
  nextStep,
  previousStep,
  recordAnswer,
  withOrder,
} from "./studyFlow.ts";
import { saveJob } from "./studyJobs.ts";
import type { StudyProgress } from "./studyProgress.ts";
import { STUDY_SCRIPTS, stepById as findStep } from "./tourScript.ts";

const STEPS = STUDY_SCRIPTS.en;
const stepById = (id: string) => findStep(STEPS, id);

const progress: StudyProgress = {
  session: "6f1c1f9e-5b7a-4c1e-9a1d-2f3b4c5d6e7f",
  source: "moodle",
  device: "phone",
  language: "en",
  stepId: "last-hard",
  answers: {},
  orders: {},
  contact: null,
};

test("a shuffled step keeps the order it was first shown in", () => {
  const step = stepById("last-hard");
  const first = withOrder(progress, step, () => 0);
  const order = first.orders["last-hard"];
  assert.deepEqual(order.slice(-2), ["nothing", "something-else"]);
  assert.equal(
    withOrder(first, step, () => 0.9),
    first,
  );
});

test("steps without shuffling store no order", () => {
  assert.equal(withOrder(progress, stepById("student")), progress);
});

test("next and back follow the participant's answers", () => {
  const answers = {
    "last-role": { chosen: ["not-tried"], shown: [], text: "" },
  };
  assert.equal(nextStep(STEPS, answers, "last-role").id, "tasks-intro");
  assert.equal(previousStep(STEPS, answers, "tasks-intro").id, "last-role");
  assert.throws(
    () => previousStep(STEPS, answers, "student"),
    /no step before/,
  );
});

test("time on a step adds up over visits and stays within the limit", () => {
  const answer = { chosen: ["no"], shown: [], text: "  a few words " };
  const first = recordAnswer(answer, undefined, 1200.4);
  assert.deepEqual(first, {
    chosen: ["no"],
    shown: [],
    text: "a few words",
    elapsedMs: 1200,
  });
  assert.equal(recordAnswer(answer, first, 800).elapsedMs, 2000);
  assert.equal(
    recordAnswer(answer, first, 2 * 60 * 60 * 1000).elapsedMs,
    3_600_000,
  );
});

test("choices need an answer; text steps can be left blank", () => {
  const empty = { chosen: [], shown: [], text: "" };
  assert.equal(isAnswered(stepById("student"), empty), false);
  assert.equal(isAnswered(stepById("last-hard"), empty), false);
  assert.equal(isAnswered(stepById("last-story"), empty), true);
  assert.equal(
    isAnswered(stepById("student"), { ...empty, chosen: ["no"] }),
    true,
  );
});

test("switching from the cheaper desk to the nearer one empties far-transport", async (t) => {
  const answers = {
    "nearer-or-cheaper": {
      chosen: ["cheaper"],
      shown: ["cheaper", "nearer", "neither"],
      text: "",
      elapsedMs: 900,
    },
    "far-transport": { chosen: ["bike"], shown: [], text: "", elapsedMs: 1500 },
  };
  const nearer = {
    ...answers,
    "nearer-or-cheaper": {
      ...answers["nearer-or-cheaper"],
      chosen: ["nearer"],
    },
  };
  const emptied = answersOffPath(STEPS, answers, nearer);
  assert.deepEqual(emptied, {
    "far-transport": { chosen: [], shown: [], text: "", elapsedMs: 1500 },
  });
  const next = { ...progress, answers: { ...nearer, ...emptied } };
  assert.equal(
    nextStep(STEPS, next.answers, "nearer-or-cheaper").id,
    "draft-check",
  );
  assert.deepEqual(answersOffPath(STEPS, answers, answers), {});

  const sent: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 200 });
    },
  );
  await saveJob(next, "far-transport").send();
  assert.deepEqual(sent, [
    {
      session: progress.session,
      step: "far-transport",
      chosen: [],
      shown: [],
      text: "",
      elapsedMs: 1500,
    },
  ]);
});
