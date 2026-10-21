import type {
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
} from "@ai-sdk/provider";
import { createAgentRuntime as createRuntime } from "../runtime.ts";
import type { AgentRunEvent } from "../../shared/runs.ts";
import type { AgentListingDraft } from "../../shared/actions.ts";

// Deterministic SDK streams. Scenarios and assertions stay in each test.
export const finish = (
  reason: "stop" | "tool-calls" = "stop",
): LanguageModelV4StreamPart => ({
  type: "finish",
  finishReason: { unified: reason, raw: reason },
  usage: {
    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 5, text: 5, reasoning: 0 },
  },
});
export const stream = (
  ...parts: LanguageModelV4StreamPart[]
): LanguageModelV4StreamResult => ({
  stream: new ReadableStream({
    start(controller) {
      controller.enqueue({ type: "stream-start", warnings: [] });
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  }),
});
export const call = (
  name: string,
  input: unknown,
  id: string,
): LanguageModelV4StreamPart => ({
  type: "tool-call",
  toolCallId: id,
  toolName: name,
  input: JSON.stringify(
    name === "web_search"
      ? { responseLanguage: "English", ...(input as object) }
      : input,
  ),
});
export const answer = (...chunks: string[]) =>
  stream(
    { type: "text-start", id: "answer" },
    ...chunks.map((delta) => ({
      type: "text-delta" as const,
      id: "answer",
      delta,
    })),
    { type: "text-end", id: "answer" },
    finish(),
  );
// Translation is exercised separately; runtime tests keep seller text deterministic.
export const createAgentRuntime = (
  config: Parameters<typeof createRuntime>[0],
) => createRuntime({ ...config, listingTextTranslator: async (text) => text });

export const ownDesk = {
  id: "own-desk",
  title: "White desk",
  price: 65,
  description: "Small scratches. Chair not included.",
  location: "Lausanne",
};
export const blankDraft: AgentListingDraft = {
  title: "",
  description: "",
  price: null,
  condition: "",
  dimensions: "",
  location: "Lausanne",
  pickup: "",
  raw: "",
};
export const eventsFor = async (
  runtime: ReturnType<typeof createAgentRuntime>,
  input: unknown,
) => {
  const events: AgentRunEvent[] = [];
  await runtime.run(input, (event) => {
    events.push(event);
  });
  return events;
};

// One model step may emit several parallel tool calls.
export const toolStep = (...calls: LanguageModelV4StreamPart[]) =>
  stream(...calls, finish("tool-calls"));

export const toolCall = (...args: Parameters<typeof call>) =>
  toolStep(call(...args));
