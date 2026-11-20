import { useCallback, useEffect, useRef, useState } from "react";
import { nextReadMarker } from "../inboxActivity";
import type { AccountInbox, AccountInboxApi, InboxRows } from "../api/inbox";

/** Realtime brings news at once; polling only catches what it missed. */
const OPEN_POLL_MS = 5_000;
const BACKGROUND_POLL_MS = 30_000;

/**
 * The signed-in student's conversations for the whole app, so the Messages
 * page and its badge agree: realtime brings new messages, and polling is a
 * backstop that runs more often while Messages is open.
 */
export function useAccountInbox(
  api: AccountInboxApi | null,
  open: boolean,
): AccountInbox {
  const [snapshot, setSnapshot] = useState<{
    userId: string;
    rows: InboxRows;
  } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [readError, setReadError] = useState("");
  const inFlight = useRef<symbol | null>(null);
  /** Grows with every local change, so a refresh that started before it cannot undo it. */
  const generation = useRef(0);
  const userId = api?.userId;
  const rows = snapshot && snapshot.userId === userId ? snapshot.rows : null;
  const refresh = useCallback(async () => {
    if (!api || inFlight.current) return;
    const request = Symbol();
    inFlight.current = request;
    const token = generation.current;
    try {
      const loaded = await api.load();
      if (generation.current === token) {
        setSnapshot({ userId: api.userId, rows: loaded });
        setLoadError("");
      }
    } catch (error) {
      if (generation.current !== token) return;
      setLoadError(
        error instanceof Error
          ? error.message
          : "Couldn't load your messages. Try again.",
      );
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, [api]);
  useEffect(() => {
    setSnapshot(null);
    setLoadError("");
    setReadError("");
    if (!api) return;
    void refresh();
    const unsubscribe = api.subscribe(() => void refresh());
    return () => {
      generation.current++;
      inFlight.current = null;
      unsubscribe();
    };
  }, [api, refresh]);
  useEffect(() => {
    if (!api) return;
    const timer = setInterval(
      () => void refresh(),
      open ? OPEN_POLL_MS : BACKGROUND_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [api, open, refresh]);
  /** Applies a local change at once; refreshes that started before it are ignored. */
  const change = useCallback(
    (update: (rows: InboxRows) => InboxRows) => {
      generation.current++;
      setSnapshot((current) =>
        current && current.userId === userId
          ? { userId, rows: update(current.rows) }
          : current,
      );
    },
    [userId],
  );
  const markRead = useCallback(
    async (conversationId: string, seenUpTo: string) => {
      if (!api || !rows?.reads) return;
      const next = nextReadMarker(rows.reads[conversationId], seenUpTo);
      if (!next) return;
      change((current) => ({
        ...current,
        reads: current.reads && { ...current.reads, [conversationId]: next },
      }));
      try {
        await api.markRead(conversationId, next);
        setReadError("");
      } catch (error) {
        console.error(error);
        setReadError(
          "Couldn't mark this conversation as read. Open it again to retry.",
        );
      }
    },
    [api, rows?.reads, change],
  );
  return { rows, loadError, readError, refresh, change, markRead };
}
