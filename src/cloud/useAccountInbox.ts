import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { nextReadMarker } from "../inboxActivity";
import type { Conversation, Message } from "./client";
import { fail, missingFromSchema } from "./client";

/** Realtime brings news at once; polling only catches what it missed. */
const OPEN_POLL_MS = 5_000;
const BACKGROUND_POLL_MS = 30_000;

export type AccountUser = { client: SupabaseClient; userId: string };

type InboxRows = {
  threads: Conversation[];
  /** The newest message of each conversation. */
  latest: Record<string, Message>;
  archived: string[];
  blocked: string[];
  names: Record<string, string>;
  /** How far the student has read each conversation; null while the server lacks the update that keeps read markers. */
  reads: Record<string, string> | null;
};

export type AccountInbox = ReturnType<typeof useAccountInbox>;

async function loadInbox(client: SupabaseClient): Promise<InboxRows> {
  const [cs, as, bs, ms, rs] = await Promise.all([
    client
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false }),
    client.from("conversation_archives").select("conversation_id"),
    client.from("blocked_users").select("blocked_id"),
    client
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    client.from("conversation_reads").select("conversation_id, last_read_at"),
  ]);
  fail(cs.error);
  fail(as.error);
  fail(bs.error);
  fail(ms.error);
  if (!missingFromSchema(rs.error)) fail(rs.error);
  const latest: Record<string, Message> = {};
  for (const message of (ms.data ?? []) as Message[])
    latest[message.conversation_id] ??= message;
  const rows = cs.data as Conversation[],
    ids = [...new Set(rows.flatMap((c) => [c.buyer_id, c.seller_id]))];
  const profiles = ids.length
    ? await client.from("profiles").select("*").in("id", ids)
    : { data: [], error: null };
  fail(profiles.error);
  return {
    threads: rows.sort((a, b) =>
      (latest[b.id]?.created_at ?? b.created_at).localeCompare(
        latest[a.id]?.created_at ?? a.created_at,
      ),
    ),
    latest,
    archived: as.data!.map((x) => x.conversation_id),
    blocked: bs.data!.map((x) => x.blocked_id),
    names: Object.fromEntries(
      (profiles.data ?? []).map((x) => [x.id, x.display_name]),
    ),
    reads: rs.error
      ? null
      : Object.fromEntries(
          (rs.data ?? []).map((read) => [
            read.conversation_id,
            read.last_read_at,
          ]),
        ),
  };
}

/**
 * The signed-in student's conversations for the whole app, so the Messages
 * page and its badge agree: realtime brings new messages, and polling is a
 * backstop that runs more often while Messages is open.
 */
export function useAccountInbox(
  connection: AccountUser | null,
  open: boolean,
) {
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
