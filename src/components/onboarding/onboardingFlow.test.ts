import test from "node:test";
import assert from "node:assert/strict";
import type { CompleteAnswers } from "./onboardingContent.ts";
import {
  STEP_COUNT,
  canContinue,
  exploreOutcome,
  finalAction,
  flowSteps,
  stepAt,
  stepBubble,
  stepLines,
} from "./onboardingFlow.ts";

test("every intent tells all three scenes between the questions and the send-off", () => {
  for (const intent of ["sell", "find", "both"] as const) {
    const steps = flowSteps(intent);
    assert.equal(steps.length, STEP_COUNT);
    assert.deepEqual(steps.slice(0, 5), [
      "welcome",
      "intro",
      "intent",
      "place",
      "items",
    ]);
    assert.deepEqual([...steps.slice(5, 8)].sort(), ["ask", "chat", "snap"]);
    assert.equal(steps.at(-1), "done");
  }
});

test("the scenes only exist once the visitor said what brings them here", () => {
  assert.equal(stepAt(4, undefined), "items");
  assert.throws(() => stepAt(5, undefined));
  assert.equal(stepAt(5, "sell"), "snap");
  assert.equal(stepAt(5, "find"), "ask");
});

test("Pako asks first and reacts once a question is answered", () => {
  assert.equal(
    stepBubble("place", { items: [] })?.title,
    "Where do you live or study?",
  );
  assert.equal(
    stepBubble("place", { place: "vortex", items: [] })?.title,
    "Vortex it is!",
  );
  assert.equal(
    stepBubble("items", { intent: "sell", items: [] })?.title,
    "What's still in your room?",
  );
  assert.equal(stepBubble("welcome", { items: [] }), undefined);
});

test("Pako's bubble keeps room for every line he may say on a question", () => {
  const intentLines = stepLines("intent", { items: [] });
  for (const intent of ["sell", "find", "both"] as const) {
    const reaction = stepBubble("intent", { intent, items: [] });
    assert.ok(intentLines.some((line) => line.id === reaction?.id));
  }
  assert.equal(intentLines[0].title, "What brings you to takeover?");
  const placeLines = stepLines("place", { place: "vortex", items: [] });
  assert.equal(placeLines.length, 9);
  assert.ok(placeLines.some((line) => line.title === "Bourdonnette it is!"));
  assert.deepEqual(
    stepLines("items", { intent: "sell", items: [] }).map(({ id }) => id),
    ["items-sell"],
  );
  assert.deepEqual(stepLines("welcome", { items: [] }), []);
});

test("questions need an answer and scenes need to be played through", () => {
  assert.equal(canContinue("intro", { items: [] }, []), true);
  assert.equal(canContinue("intent", { items: [] }, []), false);
  assert.equal(canContinue("items", { items: ["desk"] }, []), true);
  assert.equal(canContinue("chat", { items: [] }, []), false);
  assert.equal(canContinue("chat", { items: [] }, ["chat"]), true);
});

test("the send-off opens what the visitor came for, or sign-in first", () => {
  const finder: CompleteAnswers = {
    intent: "find",
    place: "unil",
    items: ["desk"],
  };
  assert.deepEqual(finalAction(finder, false).outcome, {
    next: "search",
    location: "UNIL, Dorigny",
    query: "A desk under CHF 50",
  });
  assert.equal(
    finalAction({ ...finder, intent: "sell" }, false).label,
    "Take my first photo",
  );
  assert.deepEqual(finalAction(finder, true).outcome, {
    next: "sign-in",
    location: "UNIL, Dorigny",
  });
  assert.deepEqual(exploreOutcome(finder), {
    next: "explore",
    location: "UNIL, Dorigny",
  });
});
