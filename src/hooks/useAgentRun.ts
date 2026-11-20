import type { Negotiation, NegotiationUpdate } from "../../shared/negotiation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentRunEvent,
  AgentRunDiagnostic,
  AgentRunRequest,
  AgentRunSource,
  AgentReasoningPart,
} from "../../shared/runs";
import type {
  AgentActionEvent,
  AgentQuestionEvent,
} from "../../shared/actions";
import { isAgentBusy, retryOnceWhenBusy } from "../api/busyRetry.ts";
import { streamAgentRun } from "../api/runs.ts";
import { randomUuid } from "../randomUuid.ts";

export type AgentRunStep = Extract<AgentRunEvent, { type: "status" }>;
export type AgentRunAction = Exclude<AgentActionEvent, AgentQuestionEvent>;
export type AgentRunTurn = {
  id: string | null;
  turnKey?: string;
  proposal?: Negotiation;
  request: string;
  status: "idle" | "running" | "complete" | "error";
  text: string;
  reasoning?: AgentReasoningPart[];
  sources: AgentRunSource[];
  questions: AgentQuestionEvent[];
  answers: Record<string, string>;
  actions: AgentRunAction[];
  error: string | null;
  steps?: AgentRunStep[];
  inventoryMatchIds?: string[] | null;
  watchSuggestion?: { query: string; maxPrice?: number };
};
export type AgentRunState = AgentRunTurn & {
  /** The server was busy: Pako is retrying once, or it stayed busy and nothing started. */
  congested?: "retrying" | "failed";
  offerListingIds?: string[];
  inventoryMatchIds: string[] | null;
  diagnostic?: AgentRunDiagnostic;
  steps: AgentRunStep[];
  history: AgentRunTurn[];
};
export type AgentRunOptions = {
  onNegotiation?: (event: NegotiationUpdate) => void;
  onAction?: (action: AgentRunAction) => void;
  /** Start over explicitly, or call reset, to discard earlier conversation. */
  preserveHistory?: boolean;
};

export const emptyAgentRunState = (): AgentRunState => ({
  id: null,
  request: "",
  status: "idle",
  text: "",
  reasoning: [],
  sources: [],
  inventoryMatchIds: null,
  questions: [],
  answers: {},
  actions: [],
  steps: [],
  history: [],
  error: null,
});

export function beginAgentRun(
  previous: AgentRunState,
  text: string,
  id: string,
  preserveHistory = true,
  retrying = false,
): AgentRunState {
  let history = preserveHistory ? previous.history : [];
  if (
    preserveHistory &&
    !retrying &&
    previous.id &&
    (previous.text ||
      previous.sources.length ||
      previous.inventoryMatchIds?.length ||
      previous.questions.length ||
      previous.actions.length ||
      previous.reasoning?.some((part) => part.text) ||
      previous.proposal?.draft)
  ) {
    history = [
      ...history,
      {
        id: previous.id,
        turnKey: previous.turnKey,
        proposal: previous.proposal,
        request: previous.request,
        status: previous.status,
        text: previous.text,
        reasoning: stopReasoning(previous.reasoning),
        sources: previous.sources,
        questions: previous.questions,
        answers: previous.answers,
        actions: previous.actions,
        error: previous.error,
        steps: previous.steps,
        inventoryMatchIds: previous.inventoryMatchIds,
        watchSuggestion: previous.watchSuggestion,
      },
    ];
  }
  return {
    ...emptyAgentRunState(),
    id,
    turnKey: id,
    request: text,
    status: "running",
    history,
  };
}

export function applyAgentRunEvent(
  state: AgentRunState,
  event: AgentRunEvent,
): AgentRunState {
  switch (event.type) {
    case "reasoning_start":
      return {
        ...state,
        reasoning: [
          ...(state.reasoning ?? []),
          { id: event.id, text: "", status: "streaming" },
        ],
      };
    case "reasoning_delta":
      return {
        ...state,
        reasoning: state.reasoning?.map((part) =>
          part.id === event.id
            ? { ...part, text: part.text + event.text }
            : part,
        ),
      };
    case "reasoning_end":
      return {
        ...state,
        reasoning: state.reasoning?.map((part) =>
          part.id === event.id
            ? { ...part, status: "complete", durationMs: event.durationMs }
            : part,
        ),
      };
    case "negotiation_update":
      return { ...state, proposal: event.negotiation };
    case "status": {
      const exists = state.steps.some((step) => step.id === event.id);
      return {
        ...state,
        steps: exists
          ? state.steps.map((step) => (step.id === event.id ? event : step))
          : [...state.steps, event],
      };
    }
    case "text_delta":
      return { ...state, text: state.text + event.text };
    case "sources":
      // Every event is an authoritative snapshot. An empty snapshot also clears
      // earlier platforms immediately when the agent changes the search scope.
      return { ...state, sources: event.sources };
    case "offer_suggestion":
      return {
        ...state,
        offerListingIds: [
          ...new Set([...(state.offerListingIds ?? []), event.listingId]),
        ].slice(0, 6),
      };
    case "watch_suggestion":
      return {
        ...state,
        watchSuggestion: {
          query: event.query,
          ...(event.maxPrice === undefined ? {} : { maxPrice: event.maxPrice }),
        },
      };
    case "inventory_matches":
      return { ...state, inventoryMatchIds: event.ids };
    case "question": {
      const asked = queuedQuestions(event);
      const ids = new Set(asked.map((question) => question.id));
      return {
        ...state,
        questions: [
          ...state.questions.filter((question) => !ids.has(question.id)),
          ...asked,
        ],
      };
    }
    case "listing_patch":
    case "preferences_patch":
      return {
        ...state,
        actions: [
          ...state.actions.filter((action) => action.id !== event.id),
          event,
        ],
      };
    case "complete":
      return {
        ...state,
        id: event.runId,
        status: "complete",
        reasoning: stopReasoning(state.reasoning),
        text: event.text,
        sources: event.sources,
        error: null,
      };
    case "error":
      return {
        ...state,
        status: "error",
        reasoning: stopReasoning(state.reasoning),
        error: event.message,
        diagnostic: event.diagnostic,
      };
  }
}

function stopReasoning(parts?: AgentReasoningPart[]) {
  return parts?.map((part) =>
    part.status === "streaming"
      ? { ...part, status: "stopped" as const }
      : part,
  );
}

/** The questions Pako queued behind one are asked on their own, right after it. */
function queuedQuestions(event: AgentQuestionEvent): AgentQuestionEvent[] {
  const { followUps = [], ...asked } = event;
  return [
    asked,
    ...followUps.map((followUp, index) => ({
      ...followUp,
      type: "question" as const,
      id: `${event.id}:${index + 1}`,
    })),
  ];
}

export function answerAgentQuestion(
  state: AgentRunState,
  id: string,
  answer: string,
): AgentRunState {
  if (!state.questions.some((question) => question.id === id) || !answer.trim())
    return state;
  return {
    ...state,
    answers: { ...state.answers, [id]: answer.trim().slice(0, 4000) },
  };
}

/** Takes an answer back, so the question waits in its place again. */
export function unanswerAgentQuestion(
  state: AgentRunState,
  id: string,
): AgentRunState {
  if (!Object.hasOwn(state.answers, id)) return state;
  return {
    ...state,
    answers: Object.fromEntries(
      Object.entries(state.answers).filter(([answered]) => answered !== id),
    ),
  };
}

/** A question Pako asks without a run joins the turn once the student answers it. */
export function answerLocalQuestion(
  state: AgentRunState,
  question: AgentQuestionEvent,
  answer: string,
): AgentRunState {
  const asked = state.questions.some((item) => item.id === question.id)
    ? state
    : { ...state, questions: [...state.questions, question] };
  return answerAgentQuestion(asked, question.id, answer);
}

/** A restored conversation, such as the tab's last search, starts where it ended. */
export function useAgentRun(restored?: AgentRunState) {
  const [state, setState] = useState<AgentRunState>(
    () => restored ?? emptyAgentRunState(),
  );
  const active = useRef<AbortController | null>(null);
  const lastRequest = useRef<{
    input: AgentRunRequest;
    options: AgentRunOptions;
  } | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
      active.current = null;
    };
  }, []);

  const start = useCallback(
    async (
      request: AgentRunRequest,
      options: AgentRunOptions = {},
      retrying = false,
    ) => {
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      const input = structuredClone(request);
      lastRequest.current = { input, options };
      const id = randomUuid();
      setState((previous) =>
        beginAgentRun(
          previous,
          input.text,
          id,
          options.preserveHistory !== false,
          retrying,
        ),
      );
      const isCurrent = () =>
        mounted.current &&
        active.current === controller &&
        !controller.signal.aborted;
      try {
        const onEvent = (event: AgentRunEvent) => {
          if (!isCurrent()) return;
          if (event.type === "negotiation_update")
            options.onNegotiation?.(event);
          setState((previous) =>
            applyAgentRunEvent({ ...previous, congested: undefined }, event),
          );
          if (
            event.type === "listing_patch" ||
            event.type === "preferences_patch"
          )
            options.onAction?.(event);
        };
        await retryOnceWhenBusy(
          () => streamAgentRun(input, { signal: controller.signal, onEvent }),
          {
            signal: controller.signal,
            onRetry: () =>
              setState((previous) => ({ ...previous, congested: "retrying" })),
          },
        );
      } catch (error) {
        if (isCurrent())
          setState((previous) => ({
            ...previous,
            status: "error",
            congested: isAgentBusy(error) ? "failed" : undefined,
            reasoning: stopReasoning(previous.reasoning),
            error:
              error instanceof Error
                ? error.message
                : "I stopped before I finished. Try again.",
          }));
      } finally {
        if (active.current === controller) active.current = null;
      }
    },
    [],
  );

  const run = useCallback(
    (request: AgentRunRequest, options?: AgentRunOptions) =>
      start(request, options),
    [start],
  );
  const cancel = useCallback(() => {
    if (!active.current) return;
    active.current.abort();
    active.current = null;
    setState((previous) =>
      previous.status === "running"
        ? {
            ...previous,
            status: "idle",
            error: null,
            reasoning: stopReasoning(previous.reasoning),
          }
        : previous,
    );
  }, []);
  const reset = useCallback(() => {
    active.current?.abort();
    active.current = null;
    lastRequest.current = null;
    setState(emptyAgentRunState());
  }, []);
  const retry = useCallback(async () => {
    const last = lastRequest.current;
    if (last) await start(last.input, last.options, true);
  }, [start]);
  const markQuestionAnswered = useCallback(
    (id: string, answer: string) =>
      setState((previous) => answerAgentQuestion(previous, id, answer)),
    [],
  );
  const unanswerQuestion = useCallback(
    (id: string) => setState((previous) => unanswerAgentQuestion(previous, id)),
    [],
  );
  const answerOwnQuestion = useCallback(
    (question: AgentQuestionEvent, answer: string) =>
      setState((previous) => answerLocalQuestion(previous, question, answer)),
    [],
  );

  return {
    state,
    run,
    cancel,
    reset,
    retry,
    markQuestionAnswered,
    unanswerQuestion,
    answerOwnQuestion,
  };
}
