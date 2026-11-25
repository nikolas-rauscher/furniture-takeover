import assert from "node:assert/strict";
import test from "node:test";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { readServerConfig } from "./config.ts";
import { createAgentService } from "./service.ts";
import {
  deepseekThinkingOptions,
  languageModel,
  providerBaseUrls,
  thinkingOptions,
  type ModelAccess,
} from "./model-provider.ts";
import { fakeFetch, output } from "./testing/provider.ts";

const openai: ModelAccess = {
  provider: "openai",
  apiKey: "test-openai-key",
  baseUrl: providerBaseUrls.openai,
  model: "gpt-6.1-terra",
};

function message(text: string, phase = "final_answer") {
  return {
    type: "message",
    id: "msg_1",
    role: "assistant",
    status: "completed",
    phase,
    content: [{ type: "output_text", text, annotations: [] }],
  };
}

for (const [model, efforts] of [
  ["gpt-6.1-terra", ["none", "low"]],
  ["gpt-6-luna", ["none", "low"]],
  ["gpt-6.2-sol", ["low"]],
] as const) {
  for (const effort of efforts)
    test(`${model} sends ${effort} through forced and automatic steps`, async () => {
      const access = { ...openai, model, openaiReasoningEffort: effort };
      const opaque = {
        type: "reasoning",
        id: "rs_1",
        encrypted_content: "opaque",
        summary: [],
      };
      let calls = 0;
      const result = await generateText({
        model: languageModel(
          access,
          fakeFetch(async (url, init) => {
            const body = JSON.parse(String(init?.body));
            assert.equal(url, "https://api.openai.com/v1/responses");
            assert.equal(body.model, model);
            assert.equal(body.store, false);
            assert.equal(body.reasoning?.effort, effort);
            assert.equal(body.text.verbosity, "low");
            assert.equal(body.thinking, undefined);
            assert.equal(body.service_tier, undefined);
            assert.equal(body.tool_choice, calls === 0 ? "required" : "auto");
            if (++calls === 1)
              return Response.json({
                output: [
                  opaque,
                  {
                    type: "function_call",
                    id: "fc_1",
                    call_id: "call_1",
                    name: "lookup",
                    arguments: "{}",
                  },
                ],
              });
            assert.ok(
              body.input.some(
                (item: typeof opaque) =>
                  item.type === "reasoning" &&
                  item.encrypted_content === opaque.encrypted_content,
              ),
            );
            assert.ok(
              body.input.some(
                (item: { type: string; call_id?: string }) =>
                  item.type === "function_call_output" &&
                  item.call_id === "call_1",
              ),
            );
            assert.equal(body.previous_response_id, undefined);
            return Response.json({ output: [message("Done")] });
          }),
        ),
        prompt: "Desk",
        tools: {
          lookup: tool({
            inputSchema: z.object({}),
            execute: async () => "Desk",
          }),
        },
        providerOptions: thinkingOptions(true, access),
        prepareStep: ({ stepNumber }) => ({
          toolChoice: stepNumber === 0 ? "required" : "auto",
          providerOptions: deepseekThinkingOptions(stepNumber > 0),
        }),
        stopWhen: stepCountIs(2),
        maxRetries: 0,
      });
      assert.equal(result.text, "Done");
      assert.equal(calls, 2);
    });
}

test("Sol uses low on forced steps and rejects an incompatible configuration", () => {
  const env = {
    AI_PROVIDER: "openai",
    OPENAI_MODEL: "gpt-6.2-sol",
    OPENAI_API_KEY: "test-key",
  };
  assert.equal(
    thinkingOptions(false, readServerConfig(env).modelAccess).openai
      .reasoningEffort,
    "low",
  );
  assert.throws(
    () => readServerConfig({ ...env, OPENAI_REASONING_EFFORT: "none" }),
    /gpt-6.2-sol requires at least low/,
  );
  assert.throws(
    () => readServerConfig({ ...env, OPENAI_REASONING_EFFORT: "minimal" }),
    /OPENAI_REASONING_EFFORT/,
  );
});

test("Photo assist sends a stateless JSON request and reads the completed answer", async () => {
  const image = "data:image/png;base64,iVBORw0KGgo=";
  let calls = 0;
  const service = createAgentService({
    ...openai,
    fetchImpl: fakeFetch(async (url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(body.model, openai.model);
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, 1600);
      assert.deepEqual(body.reasoning, { effort: "low" });
      assert.deepEqual(body.text, {
        format: { type: "json_object" },
        verbosity: "low",
      });
      assert.equal(body.input[0].role, "developer");
      assert.deepEqual(body.input[1].content[1], {
        type: "input_image",
        image_url: image,
        detail: "auto",
      });
      return Response.json({
        status: "completed",
        output: [
          { type: "reasoning", summary: [] },
          message("One moment", "commentary"),
          message(JSON.stringify(output)),
        ],
      });
    }),
  });
  const result = await service.assist({
    intent: "search",
    text: "white desk",
    images: [image],
  });
  assert.equal(result.model, openai.model);
  assert.equal(result.metadata.query, "white desk");
  assert.equal(calls, 1);
});

test("An incomplete or refused answer cannot be accepted as an assist result", async () => {
  for (const response of [
    {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [message(JSON.stringify(output))],
    },
    {
      status: "completed",
      output: [
        {
          ...message(""),
          content: [{ type: "refusal", refusal: "Unavailable" }],
        },
      ],
    },
  ]) {
    let calls = 0;
    const service = createAgentService({
      ...openai,
      fetchImpl: fakeFetch(async () => {
        calls++;
        return Response.json(response);
      }),
    });
    await assert.rejects(
      service.assist({ intent: "search", text: "white desk" }),
      { code: "INVALID_AGENT_RESPONSE" },
    );
    assert.equal(calls, 1);
  }
});
