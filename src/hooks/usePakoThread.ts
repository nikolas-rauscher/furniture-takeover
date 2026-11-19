import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { DealRole } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { ThreadTurn, ThreadTurnRequest } from "../../shared/threadTurn";
import { AgentApiError } from "../api/agent";
import { requestThreadTurn, threadTurnRequest } from "../api/threads";
import { pakoReadDecision, type ThreadMessage } from "../pakoThread";
import type { PakoTurnCache } from "../pakoTurnCache";
import { useOnline } from "./useOnline";
import { usePageVisible } from "./usePageVisible";

/** The open thread, from the side of the student who reads it. */
export type PakoThread = {
  /** The thread and the role it is read for; another key starts over. */
  key: string;
  role: DealRole;
  listing: Product;
  messages: readonly ThreadMessage[];
  /** The messages and the deal have loaded, so the newest message is known and whether it is structured. */
  loaded: boolean;
  /** The deal as the student sees it, for Pako's reading. */
  deal: ThreadTurnRequest["deal"];
  cache: PakoTurnCache;
};

/** Whether Pako can read replies here: the AI may not be set up, or the account server may lack its update. */
export type PakoAvailability = "ready" | "unconfigured" | "missing";

export type PakoTrayState =
  | { phase: "idle" }
  | { phase: "reading" }
  | { phase: "asking" }
  | {
      phase: "ready";
      turn: ThreadTurn;
      /** The student asked for this one; it answers the request, not a reply. */
      asked: boolean;
      /** Saving it failed, so a reload reads the reply again. */
      unsaved: boolean;
    }
  | { phase: "paused" }
  | { phase: "asleep" }
  | { phase: "offline" }
  | { phase: "error"; message: string }
  | { phase: "unavailable"; reason: Exclude<PakoAvailability, "ready"> };

type Ask = { instruction: string; draft: string };
type Attempt = { key: string; forMessageId: string | null; asked: boolean } & (
  { status: "running" } | { status: "failed"; code: string; message: string }
);
type Reading = {
  key: string;
  forMessageId: string | null;
  turn: ThreadTurn;
  asked: boolean;
  unsaved: boolean;
};
type Cached = { key: string } & (
  | { status: "loading" }
  | { status: "loaded" }
  | { status: "broken"; message: string }
);

const UNREAD = "I couldn't read this reply. Try again or write your own.";

/** A failed reading in the tray's words: out of readings, not set up here, or a plain failure. */
function failedTray(attempt: Extract<Attempt, { status: "failed" }>): PakoTrayState {
  if (attempt.code === "THREAD_QUOTA_EXCEEDED") return { phase: "asleep" };
  if (attempt.code === "AGENT_NOT_CONFIGURED")
    return { phase: "unavailable", reason: "unconfigured" };
  if (attempt.code === "THREAD_READING_UNAVAILABLE")
    return { phase: "unavailable", reason: "missing" };
  return { phase: "error", message: attempt.message };
}

/**
 * Pako beside one thread: he shows his kept reading of the latest reply, reads
 * a new reply by himself when he may, or offers to on a tap. Asking him for
 * something is always a tap. He never sends anything.
 */
export function usePakoThread({
  thread,
  available,
  autoRead,
  remaining,
  visible,
  onRemaining,
}: {
  thread: PakoThread | null;
  available: PakoAvailability;
  autoRead: boolean;
  /** Readings left today; undefined while unknown or unlimited. */
  remaining: number | undefined;
  /** The thread is on screen. */
  visible: boolean;
  onRemaining: (remaining: number) => void;
}) {
  const online = useOnline();
  const pageVisible = usePageVisible();
  const [cached, setCached] = useState<Cached>();
  const [shown, setShown] = useState<Reading>();
  const [attempt, setAttempt] = useState<Attempt>();
  const request = useRef<AbortController | null>(null);
  const key = thread?.key;
  const current = <Value extends { key: string }>(value: Value | undefined) =>
    value && value.key === key ? value : undefined;
  const latest = thread?.messages.at(-1);
  const latestId = latest?.id ?? null;
  const ownAttempt = current(attempt);
  const ownReading = current(shown);
  const ownCache = current(cached);

  const loadCache = useEffectEvent(() => {
    if (!thread) return () => undefined;
    let alive = true;
    const { key, cache } = thread;
    setCached({ key, status: "loading" });
    cache.load().then(
      (turn) => {
        if (!alive) return;
        setCached({ key, status: "loaded" });
        if (turn)
          setShown((reading) =>
            reading?.key === key
              ? reading
              : {
                  key,
                  forMessageId: turn.forMessageId,
                  turn,
                  asked: false,
                  unsaved: false,
                },
          );
      },
      (error: unknown) => {
        if (alive)
          setCached({
            key,
            status: "broken",
            message: error instanceof Error ? error.message : UNREAD,
          });
      },
    );
    return () => {
      alive = false;
    };
  });
  useEffect(() => loadCache(), [key]);
  // A reading still on its way belongs to the thread it was asked for.
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
      setAttempt((value) => (value?.status === "running" ? undefined : value));
    },
    [key],
  );

  const start = useEffectEvent(async (ask?: Ask) => {
    if (!thread) return;
    const { key, role, listing, messages, deal, cache } = thread;
    const forMessageId = messages.at(-1)?.id ?? null;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const asked = Boolean(ask);
    setAttempt({ key, forMessageId, asked, status: "running" });
    try {
      const { turn, allowance } = await requestThreadTurn(
        threadTurnRequest({ role, listing, messages, deal, ask }),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (allowance) onRemaining(allowance.remaining);
      setShown({ key, forMessageId, turn, asked, unsaved: false });
      setAttempt(undefined);
      if (!asked)
        await cache
          .save(turn)
          .catch(() =>
            setShown((reading) =>
              reading?.turn === turn ? { ...reading, unsaved: true } : reading,
            ),
          );
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure =
        error instanceof AgentApiError
          ? error
          : { code: "REQUEST_FAILED", message: UNREAD };
      if (failure.code === "THREAD_QUOTA_EXCEEDED") onRemaining(0);
      setAttempt({
        key,
        forMessageId,
        asked,
        status: "failed",
        code: failure.code,
        message: failure.message,
      });
    } finally {
      if (request.current === controller) request.current = null;
    }
  });

  const handled =
    ownReading?.forMessageId === latestId ||
    ownAttempt?.forMessageId === latestId;
  const decision = pakoReadDecision({
    latest,
    loaded: Boolean(thread?.loaded) && ownCache?.status === "loaded",
    handledId: handled ? (latestId ?? undefined) : undefined,
    visible: visible && pageVisible,
    autoRead,
    remaining,
    online,
  });

  let tray: PakoTrayState;
  if (!thread) tray = { phase: "idle" };
  else if (available !== "ready")
    tray =
      latest?.from === "them"
        ? { phase: "unavailable", reason: available }
        : { phase: "idle" };
  else if (ownAttempt?.status === "running")
    tray = { phase: ownAttempt.asked ? "asking" : "reading" };
  else if (
    ownAttempt?.status === "failed" &&
    ownAttempt.forMessageId === latestId
  )
    tray = failedTray(ownAttempt);
  else if (ownReading && ownReading.forMessageId === latestId)
    tray = {
      phase: "ready",
      turn: ownReading.turn,
      asked: ownReading.asked,
      unsaved: ownReading.unsaved,
    };
  else if (ownCache?.status === "broken" && latest?.from === "them")
    tray = { phase: "error", message: ownCache.message };
  else if (decision === "read") tray = { phase: "reading" };
  else if (decision === "idle") tray = { phase: "idle" };
  else tray = { phase: decision };

  const reading = ownAttempt?.status === "running";
  useEffect(() => {
    if (decision === "read" && available === "ready" && !reading) void start();
  }, [decision, available, reading]);

  return {
    tray,
    /** Asking takes a tap, while Pako can read here and is not busy. */
    canAsk:
      available === "ready" &&
      tray.phase !== "reading" &&
      tray.phase !== "asking",
    /** Reads the latest reply now: "Read it" or "Try again". */
    read: () => void start(),
    ask: (instruction: string, draft: string) =>
      void start({ instruction, draft }),
  };
}
