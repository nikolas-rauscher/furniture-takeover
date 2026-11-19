import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Message } from "./client";
import { fail } from "./client";

const POLL_MS = 5_000;
const PAGE = 500;

/** Every message of one conversation, oldest first, kept current by realtime and polling. */
export function useAccountThread(
  client: SupabaseClient,
  conversationId: string | undefined,
) {
  const [thread, setThread] = useState<{
    id: string;
    messages: Message[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setThread(null);
    setError("");
    if (!conversationId) return;
    let alive = true,
      loading = false;
    async function load() {
      if (loading) return;
      loading = true;
      try {
        const rows: Message[] = [];
        for (let from = 0; ; from += PAGE) {
          const result = await client
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId!)
            .order("created_at")
            .order("id")
            .range(from, from + PAGE - 1);
          fail(result.error);
          rows.push(...(result.data as Message[]));
          if (result.data!.length < PAGE) break;
        }
        if (alive) {
          setThread({ id: conversationId!, messages: rows });
          setError("");
        }
      } catch (failure) {
        if (alive)
          setError(
            failure instanceof Error
              ? failure.message
              : "Couldn't load this conversation. Try again.",
          );
      } finally {
        loading = false;
      }
    }
    const refresh = () => void load();
    void load();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("takeover-message-sent", refresh);
    const channel = client
      .channel(`account-thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("takeover-message-sent", refresh);
      void client.removeChannel(channel);
    };
  }, [client, conversationId]);
  const own = thread && thread.id === conversationId ? thread : null;
  return {
    messages: own?.messages ?? [],
    /** A conversation that does not exist yet has nothing to load. */
    loaded: !conversationId || own !== null,
    error,
  };
}
