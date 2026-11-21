import assert from "node:assert/strict";
import test from "node:test";
import { resumeDraft } from "./draftResume.ts";

test("a decision saved before a reload is shown again, not asked a second time", () => {
  const sent = { chosen: ["sent-unchanged"], text: "Hi Mia! Saturday works." };
  assert.deepEqual(resumeDraft("sat", sent), {
    day: "sat",
    phase: "decided",
    decision: sent,
  });
  const notSent = { chosen: ["not-sent"], text: "" };
  assert.deepEqual(resumeDraft("sun", notSent), {
    day: "sun",
    phase: "decided",
    decision: notSent,
  });
});

test("a reload before the decision resumes at the day, the draft or the message started", () => {
  assert.deepEqual(resumeDraft(undefined, undefined), { phase: "ask" });
  assert.deepEqual(resumeDraft("sat", undefined), {
    day: "sat",
    phase: "decide",
  });
  assert.deepEqual(resumeDraft("sat", { chosen: ["own"], text: "" }), {
    day: "sat",
    phase: "write",
    writing: "own",
  });
  assert.deepEqual(resumeDraft("sun", { chosen: [], text: "" }), {
    day: "sun",
    phase: "decide",
  });
});
