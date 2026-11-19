import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { nextReadMarker } from "../inboxActivity";
import { loadInbox, type InboxRows } from "./accountInbox";

/** Realtime brings news at once; polling only catches what it missed. */
const OPEN_POLL_MS = 5_000;
const BACKGROUND_POLL_MS = 30_000;

export type AccountUser = { client: SupabaseClient; userId: string };

export type AccountInbox = ReturnType<typeof useAccountInbox>;

/**
 * The signed-in student's conversations for the whole app, so the Messages
 * page and its badge agree: realtime brings new messages, and polling is a
 * backstop that runs more often while Messages is open.
 */
export function useAccountInbox(connection: AccountUser | null, open: boolean) {
  const [rows, setRows] = useState<InboxRows | null>(null);
  const [loadError, setLoadError] = useState("");
  const [readError, setReadError] = useState("");
  const inFlight = useRef(false);
  /** Grows with every local change, so a refresh that started before it cannot undo it. */
  const generation = useRef(0);
  const client = connection?.client;
  const userId = connection?.userId;
  const refresh = useCallback(async () => {
    if (!client || inFlight.current) return;
    inFlight.current = true;
    const token = generation.current;
    try {
      const loaded = await loadInbox(client);
      if (generation.current === token) {
        setRows(loaded);
        setLoadError("");
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load messages.",
      );
    } finally {
      inFlight.current = false;
    }
  }, [client]);
  useEffect(() => {
    setRows(null);
    if (!client || !userId) return;
    void refresh();
    const channel = client
      .channel(`account-inbox-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void refresh(),
      )
      .subscribe();
    return () => void client.removeChannel(channel);
  }, [client, userId, refresh]);
  useEffect(() => {
    if (!client) return;
    const timer = setInterval(
      () => void refresh(),
      open ? OPEN_POLL_MS : BACKGROUND_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [client, open, refresh]);
  /** Applies a local change at once; refreshes that started before it are ignored. */
  const change = useCallback((update: (rows: InboxRows) => InboxRows) => {
    generation.current++;
    setRows((current) => current && update(current));
  }, []);
  const markRead = useCallback(
    async (conversationId: string, seenUpTo: string) => {
      if (!client || !userId || !rows?.reads) return;
      const next = nextReadMarker(rows.reads[conversationId], seenUpTo);
      if (!next) return;
      change((current) => ({
        ...current,
        reads: current.reads && { ...current.reads, [conversationId]: next },
      }));
      const result = await client.from("conversation_reads").upsert({
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: next,
      });
      setReadError(
        result.error
          ? `Could not mark this conversation as read: ${result.error.message}`
          : "",
      );
    },
    [client, userId, rows?.reads, change],
  );
  return { rows, loadError, readError, refresh, change, markRead };
}
