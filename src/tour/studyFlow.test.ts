import assert from "node:assert/strict";
import test from "node:test";
import {
  isAnswered,
  nextStep,
  previousStep,
  recordAnswer,
  withOrder,
} from "./studyFlow.ts";
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
