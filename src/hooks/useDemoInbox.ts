import { useCallback, useEffect, useRef, useState } from "react";
import type { SellerConversation } from "../../shared/messages";
import type { DemoInbox, DemoInboxApi } from "../api/inbox";

/** Messages look for news often while open, and now and then elsewhere in the app. */
const OPEN_POLL_MS = 4_000;
const BACKGROUND_POLL_MS = 10_000;

/**
 * The local workspace's conversations for the whole app, so the Messages page
 * and its badge agree. A tab in the background does not ask for news.
 */
export function useDemoInbox(api: DemoInboxApi, open: boolean): DemoInbox {
  const [conversations, setConversations] = useState<SellerConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  /** Grows with every local change, so a poll that started before it cannot undo it. */
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const startedAt = revision.current;
    try {
      const items = await api.load();
      if (startedAt !== revision.current) return;
      setConversations(items);
      setLoaded(true);
      setError("");
    } catch (failure) {
      if (startedAt !== revision.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Messages are unavailable. Try again.",
      );
    }
  }, [api]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible") void refresh();
      },
      open ? OPEN_POLL_MS : BACKGROUND_POLL_MS,
    );
    return () => clearInterval(timer);
  }, [open, refresh]);
  return {
    conversations,
    refresh,
    loaded,
    error,
    async reset() {
      await api.clear();
      revision.current++;
      setConversations([]);
      setError("");
      setLoaded(false);
      await refresh();
    },
    /** Shows a conversation the server returned after a change, on top. */
    put(conversation: SellerConversation) {
      revision.current++;
      setConversations((items) => [
        conversation,
        ...items.filter((item) => item.id !== conversation.id),
      ]);
    },
    /** Takes a deleted conversation out of the inbox. */
    remove(id: string) {
      revision.current++;
      setConversations((items) => items.filter((item) => item.id !== id));
    },
  };
}
