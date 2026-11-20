import type { AccountInboxApi } from "../api/inbox";
import { useEffect, useState } from "react";
import type { Message } from "./client";

const POLL_MS = 5_000;

/** Every message of one conversation, oldest first, kept current by realtime and polling. */
export function useAccountThread(
  api: AccountInboxApi,
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
    const id = conversationId;
    let alive = true,
      loading = false;
    async function load() {
      if (loading) return;
      loading = true;
      try {
        const rows = await api.loadMessages(id);
        if (alive) {
          setThread({ id, messages: rows });
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
    const unsubscribe = api.subscribeMessages(id, refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("takeover-message-sent", refresh);
      unsubscribe();
    };
  }, [api, conversationId]);
  const own = thread && thread.id === conversationId ? thread : null;
  return {
    messages: own?.messages ?? [],
    /** A conversation that does not exist yet has nothing to load. */
    loaded: !conversationId || own !== null,
    error,
  };
}
