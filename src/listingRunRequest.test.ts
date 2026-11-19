import test from "node:test";
import assert from "node:assert/strict";
import type { AgentQuestionEvent } from "../shared/actions.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import { emptyAgentRunState } from "./hooks/useAgentRun.ts";
import { listingRunRequest } from "./listingRunRequest.ts";

const draft: ListingDraft = {
  image: "photo",
  raw: "",
  title: "IKEA desk",
  description: "White desk.",
  price: "",
  condition: "",
  dimensions: "",
  location: "EPFL, Ecublens",
  pickup: "",
  category: "All",
};
const photoAnalysis = {
  missingDetails: ["What are the desk dimensions?"],
  keywords: ["desk", "furniture"],
};
const question = (id: string, text: string): AgentQuestionEvent => ({
  type: "question",
  id,
  question: text,
});

test("the first run of a new listing asks for research and carries the photo hints", () => {
  const request = listingRunRequest({
    text: " Write my listing from my photos. ",
    draft,
    conversation: emptyAgentRunState(),
    options: { start: true, photoAnalysis },
  });
  assert.equal(request.text, "Write my listing from my photos.");
  assert.equal(request.context?.intent, "listing_assist");
  assert.equal(request.context?.listingStart, true);
  assert.deepEqual(request.context?.photoAnalysis, photoAnalysis);
  assert.equal(request.context?.currentDraft?.price, null);
  assert.equal(
    "originalRequest" in (request.context ?? {}),
    false,
    "without a note there is no original request to quote",
  );
  assert.deepEqual(request.context?.recentMessages, []);
});

test("later runs keep the photo hints and the note, never the start", () => {
  const request = listingRunRequest({
    text: "It has a small scratch",
    draft: { ...draft, raw: "ikea 120x60, used 2 years" },
    conversation: {
      ...emptyAgentRunState(),
      request: "Write my listing from my photos.",
      text: "Desks like this ask CHF 35–51.",
    },
    options: { photoAnalysis, question: "Any damage?" },
  });
  assert.equal(request.context?.listingStart, undefined);
  assert.deepEqual(request.context?.photoAnalysis, photoAnalysis);
  assert.equal(request.context?.originalRequest, "ikea 120x60, used 2 years");
  assert.equal(request.context?.previousQuestion, "Any damage?");
  assert.equal(
    request.context?.previousAnswer,
    "Desks like this ask CHF 35–51.",
  );
});

test("every answered question goes along, follow-ups, Pako's own and skipped ones included", () => {
  const price = question("ask-1", "What asking price would you like?");
  const fact = question("ask-1:1", "Can the desk be taken apart?");
  const pickup = question("pako-pickup", "When can buyers pick it up?");
  const earlier = {
    ...emptyAgentRunState(),
    id: "run-1",
    request: "Write my listing from my photos.",
    questions: [price, fact],
    answers: { "ask-1": "Use CHF 40", "ask-1:1": "Skipped" },
  };
  const request = listingRunRequest({
    text: "Polish the description",
    draft,
    conversation: {
      ...emptyAgentRunState(),
      history: [earlier],
      request: "Polish the description",
      questions: [pickup],
      answers: { "pako-pickup": "Weekday evenings" },
    },
  });
  assert.deepEqual(request.context?.answeredQuestions, [
    { question: price.question, answer: "Use CHF 40" },
    { question: fact.question, answer: "Skipped" },
    { question: pickup.question, answer: "Weekday evenings" },
  ]);
  assert.deepEqual(request.context?.recentMessages, [
    { role: "user", text: "Write my listing from my photos." },
    {
      role: "assistant",
      text: `${price.question}\n${fact.question}`,
    },
    { role: "user", text: "Polish the description" },
    { role: "assistant", text: pickup.question },
  ]);
});

test("the conversation sent along is bounded", () => {
  const turns = Array.from({ length: 20 }, (_, index) => ({
    ...emptyAgentRunState(),
    id: `run-${index}`,
    request: `Message ${index}`,
    questions: [question(`q-${index}`, `Question ${index}?`)],
    answers: { [`q-${index}`]: "Yes" },
  }));
  const request = listingRunRequest({
    text: "Thanks",
    draft,
    conversation: {
      ...emptyAgentRunState(),
      history: turns,
      request: "Thanks",
      questions: Array.from({ length: 15 }, (_, index) =>
        question(`now-${index}`, `Now ${index}?`),
      ),
      answers: Object.fromEntries(
        Array.from({ length: 15 }, (_, index) => [`now-${index}`, "No"]),
      ),
    },
  });
  assert.equal(request.context?.answeredQuestions?.length, 30);
  assert.equal(request.context?.answeredQuestions?.at(-1)?.question, "Now 14?");
  assert.equal(request.context?.recentMessages?.length, 12);
});
