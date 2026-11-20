import { parseSearch } from "../shared/marketplace.ts";
import type { AgentRunRequest, AgentRunSource } from "../shared/runs.ts";
import { takeResearchedProposal, type AgentToolState } from "./agent-tools.ts";
import { RunError } from "./errors.ts";
import { askingPriceQuestion } from "./listing-questions.ts";
import type { createRunActivity } from "./run-activity.ts";
import { needsPriceDecision, type RunMode } from "./run-policy.ts";
import type { createRunStream } from "./run-stream.ts";
import { WebSearchError } from "./web-search.ts";

export async function finishRun({
  request,
  state,
  mode,
  hasProposal,
  refinementReply,
  result,
  stream,
  sources,
  runId,
}: {
  request: AgentRunRequest;
  state: AgentToolState;
  mode: RunMode;
  hasProposal: boolean;
  refinementReply?: string;
  result: { text: PromiseLike<string>; finishReason: PromiseLike<string> };
  stream: ReturnType<typeof createRunStream>;
  sources: AgentRunSource[];
  runId: string;
}) {
  const { listingMode, negotiationMode, refinement } = mode;
  const { send } = stream;
  if (!state.pendingQuestion && needsPriceDecision(request, state)) {
    const researched = takeResearchedProposal(
      state,
      sources,
      `${runId}-proposal`,
    );
    if (researched) await send(researched);
    state.pendingQuestion = askingPriceQuestion(
      `${runId}-price`,
      state.proposedPrice,
    );
    await send(state.pendingQuestion);
  }
  const completeSearch = async (text: string) => {
    if (
      !listingMode &&
      !negotiationMode &&
      !hasProposal &&
      !state.displayedInventoryIds.length &&
      (state.inventoryCurated || state.webSearched || state.watchQuery)
    ) {
      const query =
        request.context?.currentQuery?.trim() ||
        state.watchQuery ||
        parseSearch(request.context?.originalRequest || request.text).query;
      const price = request.context?.maxPrice;
      if (query)
        await send({
          type: "watch_suggestion",
          query: query.slice(0, 120),
          ...(price !== undefined &&
          price < 1_000_000 &&
          request.context?.budgetSpecified !== false
            ? { maxPrice: price }
            : {}),
        });
    }
    await send({ type: "complete", text, sources: [...sources], runId });
  };
  if (state.pendingQuestion) {
    await stream.flushText();
    const rationale =
      state.priceReason && !stream.publicText.includes(state.priceReason)
        ? state.priceReason
        : "";
    await completeSearch(
      [stream.publicText.trim(), rationale].filter(Boolean).join("\n\n") ||
        state.pendingQuestion.question,
    );
    return;
  }
  if (refinementReply) {
    const text = stream.cleanReferences(refinementReply);
    if (state.displayedInventoryIds.length)
      await send({
        type: "offer_suggestion",
        listingId: state.displayedInventoryIds[0],
      });
    await send({ type: "text_delta", text });
    await completeSearch(text);
    return;
  }
  const text = stream.cleanReferences(await result.text).trim();
  const finishReason = await result.finishReason;
  if (finishReason === "tool-calls")
    throw new RunError("STEP_LIMIT", "I couldn't finish the comparison.");
  if (refinement || !text || finishReason !== "stop")
    throw new RunError(
      "INCOMPLETE_RESPONSE",
      "The agent did not finish its answer. Please try again.",
    );
  await stream.flushText();
  await completeSearch(text);
}

export async function reportRunError(
  error: unknown,
  {
    callerSignal,
    timeout,
    stream,
    activity,
    model,
    runId,
    startedAt,
  }: {
    callerSignal?: AbortSignal;
    timeout: AbortSignal;
    stream: ReturnType<typeof createRunStream>;
    activity: ReturnType<typeof createRunActivity>;
    model: string;
    runId: string;
    startedAt: number;
  },
) {
  const { send } = stream;
  const providerError =
    error && typeof error === "object"
      ? (error as {
          name?: string;
          statusCode?: number;
          message?: string;
          responseBody?: string;
        })
      : {};
  const providerText = `${providerError.message ?? ""} ${providerError.responseBody ?? ""}`;
  const hint =
    providerError.statusCode === 401 || providerError.statusCode === 403
      ? "The model provider rejected the backend credentials or access permissions."
      : /tool_choice|tool choice/i.test(providerText)
        ? "The model provider rejected the requested tool selection."
        : /rate.?limit|too many requests/i.test(providerText) ||
            providerError.statusCode === 429
          ? "The model provider is rate-limiting requests."
          : /insufficient|balance|credit/i.test(providerText)
            ? "The model provider reported an account or credit limit."
            : /fetch|ECONN|network/i.test(providerText)
              ? "The backend could not reach the model provider."
              : "The model request failed; completed listing matches remain available.";
  const safe = callerSignal?.aborted
    ? new RunError("REQUEST_CANCELLED", "The agent run was cancelled.")
    : timeout.aborted
      ? new RunError(
          "AGENT_TIMEOUT",
          "The agent reached the one-minute limit. Try a narrower request.",
        )
      : error instanceof RunError || error instanceof WebSearchError
        ? error
        : new RunError(
            "AGENT_UNAVAILABLE",
            "The model could not finish the comparison. Your listing matches are still available. Try again.",
          );
  await stream.failOpenStatuses();
  const diagnostic = {
    runId,
    code: safe.code,
    model,
    errorType: String(providerError.name ?? "RunError")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 80),
    ...(Number.isInteger(providerError.statusCode)
      ? { providerStatus: providerError.statusCode }
      : {}),
    stage: activity.lastStage,
    elapsedMs: Date.now() - startedAt,
    hint,
  };
  console.error(
    "[agent-run]",
    JSON.stringify(
      safe.code === "STEP_LIMIT"
        ? { ...diagnostic, stepSequence: activity.stepSequence }
        : diagnostic,
    ),
  );
  await send({
    type: "error",
    code: safe.code,
    message: safe.message,
    diagnostic,
  });
}
