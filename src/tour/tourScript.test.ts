import assert from "node:assert/strict";
import test from "node:test";
import { studyAnswerSchema, studyStartSchema } from "../../shared/study.ts";
import {
  DRAFT_ACTIONS,
  DRAFT_RESULTS,
  STUDY_SCRIPTS,
  STUDY_VERSION,
  isQuestion,
  visibleSteps as shownSteps,
  type StudyOption,
  type StudyStep,
} from "./tourScript.ts";

const SESSION = "6f1c1f9e-5b7a-4c1e-9a1d-2f3b4c5d6e7f";
const STUDY_STEPS = STUDY_SCRIPTS.en;
const visibleSteps = (answers: Parameters<typeof shownSteps>[1]) =>
  shownSteps(STUDY_STEPS, answers);

function stepOptions(step: StudyStep): StudyOption[] {
  return "options" in step ? step.options : [];
}

function optionIds(step: StudyStep): string[] {
  if (step.kind === "draft-check")
    return [...Object.values(DRAFT_ACTIONS), ...Object.values(DRAFT_RESULTS)];
  return stepOptions(step).map((option) => option.id);
}

test("step ids are unique and valid on the wire", () => {
  const ids = STUDY_STEPS.map((step) => step.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const step of STUDY_STEPS) {
    const answer = {
      session: SESSION,
      step: step.id,
      chosen: optionIds(step),
      shown: optionIds(step),
      text: "",
      elapsedMs: 0,
    };
    assert.ok(studyAnswerSchema.safeParse(answer).success, step.id);
  }
});

test("option ids are unique within each step", () => {
  for (const step of STUDY_STEPS) {
    const ids = optionIds(step);
    assert.equal(new Set(ids).size, ids.length, step.id);
  }
});

test("every condition names an earlier step and its options", () => {
  STUDY_STEPS.forEach((step, index) => {
    if (!step.when) return;
    const { step: earlierId, anyOf } = step.when;
    const earlier = STUDY_STEPS.findIndex((other) => other.id === earlierId);
    assert.ok(earlier >= 0 && earlier < index, `${step.id} → ${earlierId}`);
    const known = optionIds(STUDY_STEPS[earlier]);
    for (const id of anyOf) assert.ok(known.includes(id), `${step.id} → ${id}`);
  });
});

test("only shuffled steps mark options as always last", () => {
  for (const step of STUDY_STEPS) {
    const fixed = stepOptions(step).filter((option) => option.last);
    const shuffles =
      step.kind === "nearer-or-cheaper" ||
      (step.kind === "multiple" && step.shuffle);
    if (!shuffles) assert.equal(fixed.length, 0, step.id);
  }
});

test("not having tried skips the rest of part B", () => {
  const ids = visibleSteps({
    "last-role": { chosen: ["not-tried"], shown: [], text: "" },
  }).map((step) => step.id);
  assert.equal(ids[ids.indexOf("last-role") + 1], "tasks-intro");
});

test("the cheaper desk asks how it gets home", () => {
  const ids = (chosen: string) =>
    visibleSteps({
      "nearer-or-cheaper": { chosen: [chosen], shown: [], text: "" },
    }).map((step) => step.id);
  assert.ok(ids("cheaper").includes("far-transport"));
  assert.ok(!ids("nearer").includes("far-transport"));
});

test("students alone are asked what they study towards", () => {
  const level = (chosen: string) =>
    visibleSteps({ student: { chosen: [chosen], shown: [], text: "" } }).some(
      (step) => step.id === "level",
    );
  assert.equal(level("yes-unil"), true);
  assert.equal(level("no"), false);
});

test("every question is stored and the script ends with the end", () => {
  assert.equal(STUDY_STEPS.at(-1)?.kind, "end");
  const stored = STUDY_STEPS.filter(isQuestion).map((step) => step.id);
  assert.ok(stored.includes("draft-check"));
  assert.ok(!stored.includes("contact"));
});

test("every language has the same steps, options and conditions", () => {
  const shape = (steps: StudyStep[]) =>
    steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      when: step.when,
      options: optionIds(step),
    }));
  assert.deepEqual(shape(STUDY_SCRIPTS.fr), shape(STUDY_STEPS));
  assert.deepEqual(shape(STUDY_SCRIPTS.de), shape(STUDY_STEPS));
});

test("the version is valid on the wire", () => {
  const start = {
    session: SESSION,
    version: STUDY_VERSION,
    source: "moodle",
    device: "phone",
    adult: true,
    consent: true,
  };
  assert.ok(studyStartSchema.safeParse(start).success);
});
