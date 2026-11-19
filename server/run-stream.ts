import type { TextStreamPart, ToolSet } from "ai";
import {
  MAX_REASONING_CHARS,
  MAX_REASONING_PARTS,
  type AgentRunEvent,
  type AgentRunSource,
  type AgentTaskKind,
  type AgentToolFailure,
} from "../shared/runs.ts";
import { RunError } from "./errors.ts";

export const MAX_RUN_TEXT_CHARS = 18_000;

export function createRunStream({
  runId,
  sources,
  emit,
  callerSignal,
  abort,
}: {
  runId: string;
  sources: AgentRunSource[];
  emit: (event: AgentRunEvent) => void | Promise<void>;
  callerSignal?: AbortSignal;
  abort: () => void;
}) {
  const statuses = new Map<string, string>();
  const statusTasks = new Map<string, AgentTaskKind>();
  let publicBuffer = "";
  let publicText = "";
  let outputLength = 0;
  let reasoningLength = 0;
  let reasoningCount = 0;
  const reasoning = new Map<string, { id: string; startedAt: number }>();
  let streamFailed: unknown;

  const send = async (event: AgentRunEvent) => {
    if (event.type === "text_delta") publicText += event.text;
    if (!callerSignal?.aborted) await emit(event);
  };
  const status = async (
    id: string,
    label: string,
    state: "running" | "complete" | "error" | "needs_input",
    task?: AgentTaskKind,
    failure?: AgentToolFailure,
    detail?: string,
  ) => {
    task ??= statusTasks.get(id);
    if (task) statusTasks.set(id, task);
    if (state === "running") statuses.set(id, label);
    else statuses.delete(id);
    await send({
      type: "status",
      id,
      label,
      state,
      ...(task ? { task } : {}),
      ...(detail ? { detail } : {}),
      ...(failure ? { failure } : {}),
    });
  };
  const cleanReferences = (value: string) =>
    value.replace(/\[(?:web-\d+|\d+)\]/g, (token) =>
      sources.some((source) => token === `[${source.id}]`) ? token : "",
    );
  const streamPublicText = async (delta: string, flush = false) => {
    publicBuffer += delta;
    const lastOpen = publicBuffer.lastIndexOf("[");
    const hold =
      !flush &&
      lastOpen > publicBuffer.lastIndexOf("]") &&
      publicBuffer.length - lastOpen <= 200
        ? lastOpen
        : publicBuffer.length;
    if (hold > 0) {
      await send({
        type: "text_delta",
        text: cleanReferences(publicBuffer.slice(0, hold)),
      });
      publicBuffer = publicBuffer.slice(hold);
    }
  };

  function thinkingLimit(): never {
    abort();
    throw new RunError(
      "OUTPUT_LIMIT",
      "The agent reached its thinking limit. Try a more focused request.",
    );
  }

  function recordFailure(error: unknown) {
    streamFailed = error;
  }

  async function consume(
    parts: AsyncIterable<TextStreamPart<ToolSet>>,
    publishText: boolean,
  ) {
    for await (const part of parts) {
      if (part.type === "reasoning-start") {
        if (++reasoningCount > MAX_REASONING_PARTS) thinkingLimit();
        // Provider part IDs may repeat in later tool steps.
        const item = {
          id: `${runId}-reasoning-${reasoningCount}`,
          startedAt: performance.now(),
        };
        reasoning.set(part.id, item);
        await send({ type: "reasoning_start", id: item.id });
      } else if (part.type === "reasoning-delta") {
        const item = reasoning.get(part.id);
        if (!item) continue;
        reasoningLength += part.text.length;
        if (reasoningLength > MAX_REASONING_CHARS) thinkingLimit();
        await send({
          type: "reasoning_delta",
          id: item.id,
          text: part.text,
        });
      } else if (part.type === "reasoning-end") {
        const item = reasoning.get(part.id);
        if (!item) continue;
        await send({
          type: "reasoning_end",
          id: item.id,
          durationMs: Math.round(performance.now() - item.startedAt),
        });
        reasoning.delete(part.id);
      } else if (part.type === "text-delta") {
        outputLength += part.text.length;
        if (outputLength > MAX_RUN_TEXT_CHARS) {
          abort();
          throw new RunError(
            "OUTPUT_LIMIT",
            "The response was too long. Try a more focused request.",
          );
        }
        if (publishText) await streamPublicText(part.text);
      } else if (part.type === "error") recordFailure(part.error);
      else if (part.type === "abort")
        throw new RunError("REQUEST_CANCELLED", "The agent run was cancelled.");
      // Raw provider chunks and tool input fragments stay server-side.
    }
  }

  async function failOpenStatuses() {
    for (const [id, label] of statuses) await status(id, label, "error");
  }

  return {
    send,
    status,
    cleanReferences,
    consume,
    failOpenStatuses,
    recordFailure,
    flushText: () => streamPublicText("", true),
    get publicText() {
      return publicText;
    },
    get failure() {
      return streamFailed;
    },
  };
}
