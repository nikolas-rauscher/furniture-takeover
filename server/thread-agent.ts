import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  InvalidToolInputError,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type LanguageModel,
} from "ai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { campusPickupPoints } from "../shared/campusPickupPoints.ts";
import { formatPickup } from "../shared/pickupTime.ts";
import {
  threadTurnRequestSchema,
  type ThreadTurn,
  type ThreadTurnRequest,
} from "../shared/threadTurn.ts";
import { AgentError } from "./errors.ts";
import { groundProposal } from "./thread-grounding.ts";
import { withoutContactDetails } from "./thread-safe-text.ts";
import { logDroppedOption, replacementOption } from "./thread-options.ts";
import { proposalSchema } from "./thread-proposal.ts";
import { threadInstructions } from "./thread-instructions.ts";

export type ThreadAgentConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** Inject the official SDK mock model in tests; never supplied by HTTP callers. */
  modelImpl?: LanguageModel;
  /** The clock pickup words resolve against; tests fix it. */
  now?: () => Date;
  timeoutMs?: number;
};
export type ThreadAgent = {
  /** Whether a model key is set, so a reading can run at all. */
  configured: boolean;
  turn(request: ThreadTurnRequest, signal?: AbortSignal): Promise<ThreadTurn>;
};

const TURN_LIMIT_MS = 20_000;
/** One reading plus two repairs after a failed check. */
const MAX_STEPS = 3;
const MAX_OUTPUT_TOKENS = 1_200;
const TOOL_NAME = "propose_next_message";
const ZONE = "Europe/Zurich";

/** Why a request was rejected: a rule's own sentence, or the field that broke the schema. */
function rejectionReason(issue: z.core.$ZodIssue) {
  if (issue.code === "custom") return issue.message;
  const field = issue.path.join(".") || "request";
  if (issue.code === "unrecognized_keys")
    return `${field} has unexpected fields: ${issue.keys.join(", ")}.`;
  return `${field} is invalid.`;
}

export function validateThreadTurnRequest(input: unknown): ThreadTurnRequest {
  const parsed = threadTurnRequestSchema.safeParse(input);
  if (!parsed.success)
    throw new AgentError(
      400,
      "INVALID_THREAD_REQUEST",
      `Pako couldn't read this conversation. ${[...new Set(parsed.error.issues.map(rejectionReason))].join(" ")}`,
    );
  return parsed.data;
}

/** "Thu 19 Nov 2026, 14:05" in Zurich: the day and time Pako reads the thread on. */
const zurichNow = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function safeError(
  error: unknown,
  callerSignal: AbortSignal | undefined,
  timeout: AbortSignal,
): AgentError {
  if (callerSignal?.aborted)
    return new AgentError(
      499,
      "REQUEST_CANCELLED",
      "The request was cancelled.",
    );
  if (timeout.aborted)
    return new AgentError(
      504,
      "AGENT_TIMEOUT",
      "Pako took too long to read this. Try again.",
    );
  if (error instanceof AgentError) return error;
  return new AgentError(
    502,
    "PROVIDER_ERROR",
    "Pako can't read replies right now. Try again in a moment.",
  );
}

/** The conversation as Pako reads it, with the pickup labels and clock the server works out. */
function threadPrompt(request: ThreadTurnRequest, now: Date) {
  return JSON.stringify({
    ...request,
    messages: request.messages.map((message) => ({
      ...message,
      text: withoutContactDetails(message.text),
    })),
    pickupLabels: {
      agreed: request.deal?.agreed?.pickupAt
        ? formatPickup(request.deal.agreed.pickupAt)
        : null,
      proposed: request.deal?.proposal?.terms.pickupAt
        ? formatPickup(request.deal.proposal.terms.pickupAt)
        : null,
    },
    now: zurichNow.format(now),
    timeZone: ZONE,
    campusMeetingPoints: campusPickupPoints.map((point) => point.name),
  });
}

/**
 * Pako's reading of one conversation: a small agent with one forced tool. A
 * proposal that fails a check goes back to the model as a tool error to
 * repair; after two repairs the reading fails.
 */
export function createThreadAgent(config: ThreadAgentConfig): ThreadAgent {
  const apiKey = config.apiKey.trim();
  const model = config.model?.trim() || "deepseek-flash";
  const clock = config.now ?? (() => new Date());
  return {
    configured: Boolean(apiKey),
    async turn(request, callerSignal) {
      if (!apiKey)
        throw new AgentError(
          503,
          "AGENT_NOT_CONFIGURED",
          "Add a DeepSeek API key to the server .env so Pako can read replies.",
        );
      const runId = randomUUID();
      const startedAt = Date.now();
      const timeout = AbortSignal.timeout(
        Math.min(config.timeoutMs ?? TURN_LIMIT_MS, TURN_LIMIT_MS),
      );
      const repairDeadline = new AbortController();
      let repairTimer: ReturnType<typeof setTimeout> | undefined;
      const signal = callerSignal
        ? AbortSignal.any([callerSignal, timeout, repairDeadline.signal])
        : AbortSignal.any([timeout, repairDeadline.signal]);
      const now = clock();
      let reading: ThreadTurn | undefined;
      let repairIndex: number | undefined;
      let repairStarted = false;
      let streamFailure: unknown;
      /** The checks the model's attempts failed; fixed wording, never what the students wrote. */
      const failedChecks: string[] = [];
      let stage = "Reading the conversation";
      try {
        const provider = createDeepSeek({
          apiKey,
          baseURL: config.baseUrl || "https://api.deepseek.com",
          fetch: config.fetchImpl,
        });
        const agent = new ToolLoopAgent({
          model: config.modelImpl ?? provider(model),
          instructions: threadInstructions,
          tools: {
            [TOOL_NAME]: tool({
              description:
                "Save your reading of the conversation: the summary, the facts with their quotes, the stance and suggested replies. For accepts, return an empty options array. Nothing is sent.",
              inputSchema: proposalSchema,
              execute: async (proposal) => {
                try {
                  reading = groundProposal(proposal, request, now, runId);
                  if (
                    reading.options.length === 1 &&
                    proposal.options.length > 1
                  ) {
                    const kept = reading.options[0];
                    repairIndex = proposal.options.findIndex(
                      (_, i) => `opt-${i + 1}` !== kept.id,
                    );
                    return {
                      kept: kept.label,
                      instruction:
                        "Replace one rejected draft. Write one short, different reply about a single point. Omit extra prices, times and places.",
                    };
                  }
                } catch (error) {
                  failedChecks.push(
                    error instanceof Error ? error.message : "check failed",
                  );
                  throw error;
                }
                return { saved: true };
              },
            }),
            repair_reply: tool({
              description:
                "Replace one rejected reply. The saved reading and valid reply are already kept.",
              inputSchema: proposalSchema.shape.options.element,
              execute: async (option) => {
                if (!reading || repairIndex === undefined)
                  throw new Error("No reply needs repair.");
                const index = repairIndex;
                repairIndex = undefined;
                try {
                  reading.options.push(
                    replacementOption(option, index, reading, request, now),
                  );
                } catch (error) {
                  if (!(error instanceof Error)) throw error;
                  // An unsafe label can contain contact details.
                  const label = error.message.startsWith("replacement label")
                    ? "[redacted]"
                    : option.label;
                  logDroppedOption(runId, index, label, error);
                }
                return { saved: reading.options.length > 1 };
              },
            }),
          },
          prepareStep: () => {
            if (repairIndex === undefined) return { activeTools: [TOOL_NAME] };
            repairStarted = true;
            repairTimer = setTimeout(() => repairDeadline.abort(), 2500);
            return { activeTools: ["repair_reply"] };
          },
          toolChoice: "required",
          stopWhen: [
            stepCountIs(MAX_STEPS),
            () =>
              reading !== undefined &&
              (repairIndex === undefined || repairStarted),
          ],
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          maxRetries: 1,
          // DeepSeek cannot combine thinking with a forced tool.
          providerOptions: { deepseek: { thinking: { type: "disabled" } } },
          // Keep provider response bodies out of the console.
          prepareCall: (options) => ({
            ...options,
            onError: ({ error }: { error: unknown }) => {
              streamFailure = error;
            },
          }),
          onStepStart: async ({ stepNumber }) => {
            stage =
              stepNumber === 0
                ? "Reading the conversation"
                : `Repair ${stepNumber}`;
          },
        });
        const result = await agent.stream({
          prompt: threadPrompt(request, now),
          abortSignal: signal,
        });
        for await (const part of result.fullStream) {
          if (part.type === "error") streamFailure = part.error;
          // The SDK's message would repeat the input, which quotes the students.
          if (
            part.type === "tool-call" &&
            part.invalid &&
            InvalidToolInputError.isInstance(part.error)
          )
            failedChecks.push("the input did not match the tool's schema");
        }
        callerSignal?.throwIfAborted();
        if (repairStarted && reading) return reading;
        signal.throwIfAborted();
        if (reading) return reading;
        if (streamFailure) throw streamFailure;
        throw new AgentError(
          502,
          "THREAD_TURN_INVALID",
          "Pako couldn't read this one. Try again or reply yourself.",
        );
      } catch (error) {
        const safe = safeError(error, callerSignal, timeout);
        const status = (error as { statusCode?: unknown } | null)?.statusCode;
        console.error(
          "[thread-turn]",
          JSON.stringify({
            runId,
            code: safe.code,
            model,
            stage,
            elapsedMs: Date.now() - startedAt,
            ...(Number.isInteger(status) ? { providerStatus: status } : {}),
            ...(failedChecks.length ? { failedChecks } : {}),
          }),
        );
        if (repairStarted && reading && !callerSignal?.aborted) return reading;
        throw safe;
      } finally {
        clearTimeout(repairTimer);
      }
    },
  };
}
