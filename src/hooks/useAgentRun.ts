import type { Negotiation, NegotiationUpdate } from "../../shared/negotiation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentRunEvent,
  AgentRunDiagnostic,
  AgentRunRequest,
  AgentRunSource,
} from "../../shared/runs";
import type {
  AgentActionEvent,
  AgentQuestionEvent,
} from "../../shared/actions";
import { streamAgentRun } from "../api/runs.ts";

export type AgentRunStep = Extract<AgentRunEvent, { type: "status" }>;
export type AgentRunAction = Exclude<AgentActionEvent, AgentQuestionEvent>;
export type AgentRunTurn = {
  id: string | null;
  turnKey?: string;
  proposal?: Negotiation;
  request: string;
  status: "idle" | "running" | "complete" | "error";
  text: string;
  sources: AgentRunSource[];
  questions: AgentQuestionEvent[];
  answers: Record<string, string>;
  actions: AgentRunAction[];
  error: string | null;
  steps?: AgentRunStep[];
  inventoryMatchIds?: string[] | null;
};
export type AgentRunState = AgentRunTurn & {
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
      previous.questions.length ||
      previous.actions.length ||
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
        sources: previous.sources,
        questions: previous.questions,
        answers: previous.answers,
        actions: previous.actions,
        error: previous.error,
        steps: previous.steps,
        inventoryMatchIds: previous.inventoryMatchIds,
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
    case "inventory_matches":
      return { ...state, inventoryMatchIds: event.ids };
    case "question":
      return {
        ...state,
        questions: [
          ...state.questions.filter((question) => question.id !== event.id),
          event,
        ],
      };
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
        text: event.text,
        sources: event.sources,
        error: null,
      };
    case "error":
      return {
        ...state,
        status: "error",
        error: event.message,
        diagnostic: event.diagnostic,
      };
  }
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

export function useAgentRun() {
  const [state, setState] = useState<AgentRunState>(emptyAgentRunState);
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
      const id = crypto.randomUUID();
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
        await streamAgentRun(input, {
          signal: controller.signal,
          onEvent: (event) => {
            if (!isCurrent()) return;
            if (event.type === "negotiation_update")
              options.onNegotiation?.(event);
            setState((previous) => applyAgentRunEvent(previous, event));
            if (
              event.type === "listing_patch" ||
              event.type === "preferences_patch"
            )
              options.onAction?.(event);
          },
        });
      } catch (error) {
        if (isCurrent())
          setState((previous) => ({
            ...previous,
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "The agent stopped unexpectedly. Please try again.",
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
        ? { ...previous, status: "idle", error: null }
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

  return { state, run, cancel, reset, retry, markQuestionAnswered };
}
