import test from "node:test";
import assert from "node:assert/strict";
import { MockLanguageModelV4 } from "ai/test";
import {
  createAgentRuntime,
  eventsFor,
  ownDesk,
  stream,
  finish,
} from "../testing/runtime.ts";
import { MAX_REASONING_CHARS } from "../../shared/runs.ts";

test("the DeepSeek SDK streams reasoning across tool steps and replays it to the provider", async () => {
  const requests: {
    thinking: { type: string };
    reasoning_effort: string;
    messages: {
      role: string;
      tool_calls?: unknown[];
      reasoning_content?: string;
    }[];
  }[] = [];
  const runtime = createAgentRuntime({
    apiKey: "test-key-never-shown",
    fetchImpl: async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      const deltas =
        requests.length === 1
          ? [
              { reasoning_content: "Check the local inventory." },
              {
                tool_calls: [
                  {
                    index: 0,
                    id: "find-desk",
                    type: "function",
                    function: {
                      name: "inventory_search",
                      arguments: JSON.stringify({
                        query: "desk",
                        maxPrice: 80,
                      }),
                    },
                  },
                ],
              },
            ]
          : requests.length === 2
            ? [
                { reasoning_content: "Select the matching desk." },
                {
                  tool_calls: [
                    {
                      index: 0,
                      id: "show-desk",
                      type: "function",
                      function: {
                        name: "show_takeover_listings",
                        arguments: JSON.stringify({ ids: [ownDesk.id] }),
                      },
                    },
                  ],
                },
              ]
            : [
                { reasoning_content: "Compare the returned price." },
                { content: "The white desk costs CHF 65." },
              ];
      const chunks = [
        ...deltas.map((delta) => ({
          id: "test",
          object: "chat.completion.chunk",
          created: 0,
          model: "deepseek-flash",
          choices: [{ index: 0, delta, finish_reason: null }],
        })),
        {
          id: "test",
          object: "chat.completion.chunk",
          created: 0,
          model: "deepseek-flash",
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: requests.length < 3 ? "tool_calls" : "stop",
            },
          ],
        },
      ];
      return new Response(
        chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
          "data: [DONE]\n\n",
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  });
  const events = await eventsFor(runtime, {
    text: "Find a desk under CHF 80 on takeover",
    context: {
      intent: "listing_review",
      budgetSpecified: true,
      source: "takeover",
    },
    inventory: [ownDesk],
  });
  assert.equal(requests.length, 3);
  assert.deepEqual(requests[0].thinking, { type: "enabled" });
  assert.equal(requests[0].reasoning_effort, "low");
  const toolMessage = requests[1].messages.find(
    (message) => message.role === "assistant" && message.tool_calls,
  );
  assert.equal(toolMessage?.reasoning_content, "Check the local inventory.");
  assert.deepEqual(
    requests[2].messages
      .filter((message) => message.role === "assistant" && message.tool_calls)
      .map((message) => message.reasoning_content),
    ["Check the local inventory.", "Select the matching desk."],
  );
  const starts = events.filter((event) => event.type === "reasoning_start");
  assert.equal(starts.length, 3);
  assert.equal(new Set(starts.map((part) => part.id)).size, 3);
  assert.notEqual(starts[0].id, starts[1].id);
  assert.equal(
    events.filter((event) => event.type === "reasoning_end").length,
    3,
  );
  assert.deepEqual(
    events
      .filter((event) => event.type === "reasoning_delta")
      .map((event) => event.text),
    [
      "Check the local inventory.",
      "Select the matching desk.",
      "Compare the returned price.",
    ],
  );
  assert.equal(
    events
      .filter((event) => event.type === "text_delta")
      .map((event) => event.text)
      .join(""),
    "The white desk costs CHF 65.",
  );
  assert.equal(events.at(-1)?.type, "complete");
  assert.equal(JSON.stringify(events).includes("test-key-never-shown"), false);
});

test("reasoning has a hard output limit before the final answer", async () => {
  const model = new MockLanguageModelV4({
    doStream: stream(
      { type: "reasoning-start", id: "r" },
      {
        type: "reasoning-delta",
        id: "r",
        delta: "x".repeat(MAX_REASONING_CHARS + 1),
      },
      { type: "reasoning-end", id: "r" },
      finish(),
    ),
  });
  const events = await eventsFor(
    createAgentRuntime({ apiKey: "test", modelImpl: model }),
    { text: "Find a desk" },
  );
  assert.ok(
    events.some(
      (event) => event.type === "error" && event.code === "OUTPUT_LIMIT",
    ),
  );
  assert.equal(
    events.some((event) => event.type === "reasoning_delta"),
    false,
  );
  assert.equal(
    events.some((event) => event.type === "complete"),
    false,
  );
});
