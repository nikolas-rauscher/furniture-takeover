import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistRequest, AssistResponse } from "../../shared/agent";
import { requestAgentAssist } from "../api/agent";

export type TypingAssistRequest = AssistRequest;
export type AgentAssistState = {
  status: "idle" | "loading" | "success" | "error";
  response: AssistResponse | null;
  error: string | null;
  retry: () => void;
};

type Result = Omit<AgentAssistState, "retry"> & { requestKey: string | null };

// Keep this explicit: object identity must not trigger another API call, and a
// photo is sent only when the caller explicitly opts in for a listing request.
function requestKeyFor(request: TypingAssistRequest | null): string | null {
  if (
    !request ||
    (request.text.trim().length < 3 &&
      !request.image &&
      !request.images?.length)
  )
    return null;
  return JSON.stringify({
    intent: request.intent,
    text: request.text.trim(),
    ...(request.intent === "listing" && request.image
      ? { image: request.image }
      : {}),
    ...(request.intent === "listing" && request.images?.length
      ? { images: request.images }
      : {}),
    context: {
      location: request.context?.location,
      currentQuery: request.context?.currentQuery,
      maxPrice: request.context?.maxPrice,
      radius: request.context?.radius,
      pickupBy: request.context?.pickupBy,
    },
  } satisfies TypingAssistRequest);
}

/** Contextual help after a short pause; listing callers can explicitly include a photo. */
export function useAgentAssist(
  request: TypingAssistRequest | null,
): AgentAssistState {
  const requestKey = requestKeyFor(request);
  const [attempt, setAttempt] = useState(0);
  const completed = useRef<{
    requestKey: string;
    attempt: number;
    response: AssistResponse;
  } | null>(null);
  const [result, setResult] = useState<Result>({
    requestKey: null,
    status: "idle",
    response: null,
    error: null,
  });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!requestKey) return;
    const cached = completed.current;
    if (cached?.requestKey === requestKey && cached.attempt === attempt) {
      setResult((current) =>
        current.requestKey === requestKey && current.status === "success"
          ? current
          : {
              requestKey,
              status: "success",
              response: cached.response,
              error: null,
            },
      );
      return;
    }
    const controller = new AbortController();
    let active = true;
    setResult({ requestKey, status: "idle", response: null, error: null });

    const timer = window.setTimeout(async () => {
      setResult({ requestKey, status: "loading", response: null, error: null });
      try {
        const response = await requestAgentAssist(
          JSON.parse(requestKey) as TypingAssistRequest,
          { signal: controller.signal },
        );
        if (active) {
          completed.current = { requestKey, attempt, response };
          setResult({ requestKey, status: "success", response, error: null });
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setResult({
          requestKey,
          status: "error",
          response: null,
          error:
            error instanceof Error
              ? error.message
              : "The assistant is unavailable. Try again.",
        });
      }
    }, 700);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, attempt]);

  // Never show suggestions for the previous text, even during the render before
  // the effect cleans up an older request.
  // Pausing a visited tab keeps its completed suggestions in place. An empty
  // or changed input still hides results that belong to the previous text.
  if (!request && (result.status === "success" || result.status === "error"))
    return {
      status: result.status,
      response: result.response,
      error: result.error,
      retry,
    };
  if (!requestKey)
    return { status: "idle", response: null, error: null, retry };
  if (result.requestKey !== requestKey)
    return { status: "idle", response: null, error: null, retry };
  return {
    status: result.status,
    response: result.response,
    error: result.error,
    retry,
  };
}
