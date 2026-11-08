import { Button } from "../components/ui/button";
import { Suggestion, Suggestions } from "../components/ui/suggestion";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "@/components/icons";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "../../shared/marketplace";
import { requestAgentAssist } from "../api/agent";
import { fail } from "./client";

type Result = {
  context: string;
  status: "loading" | "ready" | "error";
  suggestions?: string[];
};

export default function ReplySuggestions({
  client,
  userId,
  conversationId,
  role,
  listing,
  latestMessageKey,
  draft,
  disabled,
  onSelect,
}: {
  client: SupabaseClient;
  userId: string;
  conversationId?: string;
  role: "buyer" | "seller";
  listing?: Product;
  latestMessageKey: string;
  draft: string;
  disabled: boolean;
  onSelect: (reply: string) => void;
}) {
  // Deliberately allowlist listing fields: no photos or participant identity.
  const item = {
    title: (listing?.title ?? "Listing unavailable").slice(0, 180),
    description: listing?.description?.slice(0, 2400),
    price: listing?.price,
    location: listing?.location?.slice(0, 180),
    condition: listing?.condition?.slice(0, 160),
    dimensions: listing?.dimensions?.slice(0, 160),
    pickup: listing
      ? [listing.available, listing.pickupBy]
          .filter(Boolean)
          .join("; ")
          .slice(0, 500)
      : undefined,
    status: listing?.status,
  };
  const context = JSON.stringify([
    conversationId,
    userId,
    role,
    item,
    latestMessageKey,
    draft,
    disabled,
  ]);
  const trayId = useId();
  const [expanded, setExpanded] = useState(true);
  const trayToggle = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const current = result?.context === context ? result : null;

  // Run before paint so changing a draft/thread also cancels an in-flight result.
  // Cleanup is safe under StrictMode's setup/cleanup/setup cycle.
  useLayoutEffect(() => {
    request.current?.abort();
    request.current = null;
    setResult(null);
    setExpanded(true);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [context, client]);

  async function suggest() {
    if (disabled || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setResult({ context, status: "loading" });
    setExpanded(true);
    try {
      let messages: { role: "self" | "other"; text: string }[] = [];
      if (conversationId) {
        const history = await client
          .from("messages")
          .select("sender_id, body")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(12)
          .abortSignal(controller.signal);
        controller.signal.throwIfAborted();
        fail(history.error);
        messages = (history.data ?? []).reverse().map((message) => ({
          role: message.sender_id === userId ? "self" : "other",
          text: message.body,
        }));
      }
      const response = await requestAgentAssist(
        {
          intent: "reply",
          text: "Suggest useful replies for this conversation.",
          conversation: { role, listing: item, messages },
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted || request.current !== controller) return;
      const suggestions = [
        ...new Set(response.suggestions.map((s) => s.trim())),
      ]
        .filter((s) => s.length > 0 && s.length <= 160)
        .slice(0, 4);
      setResult({ context, status: "ready", suggestions });
    } catch {
      if (!controller.signal.aborted && request.current === controller)
        setResult({ context, status: "error" });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  return (
    <div
      className="reply-assistance"
      aria-label="Reply suggestions"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          setExpanded(false);
          trayToggle.current?.focus();
        }
      }}
    >
      <div className="reply-assistance-action">
        <Button
          type="button"
          className="reply-suggest-button"
          disabled={disabled || current?.status === "loading"}
          onClick={() => void suggest()}
        >
          <Sparkles size={14} aria-hidden="true" />
          {current?.status === "loading"
            ? "Thinking…"
            : current?.status === "error"
              ? "Try again"
              : "Suggest replies"}
        </Button>
        {!!current?.suggestions?.length && (
          <Button
            type="button"
            ref={trayToggle}
            className="reply-tray-toggle"
            aria-expanded={expanded}
            aria-controls={trayId}
            onClick={() => setExpanded((value) => !value)}
          >
            {current.suggestions.length} replies{" "}
            <ChevronDown size={14} aria-hidden="true" />
          </Button>
        )}
        <small>
          {current?.status === "ready" && current.suggestions?.length
            ? draft.trim()
              ? "Choose a reply to replace your draft."
              : "Choose a reply, then make it yours."
            : "AI uses this listing and recent messages."}
        </small>
      </div>
      <div role="status" aria-live="polite">
        {current?.status === "loading" && (
          <p className="reply-assistance-note">
            Finding replies for this conversation…
          </p>
        )}
        {current?.status === "error" && (
          <p className="reply-assistance-note reply-assistance-error">
            Could not suggest replies. Try again or write your own.
          </p>
        )}
        {current?.status === "ready" && !current.suggestions?.length && (
          <p className="reply-assistance-note">
            No useful suggestions this time. You can write your own.
          </p>
        )}
      </div>
      {!!current?.suggestions?.length && expanded && (
        <Suggestions
          id={trayId}
          className="reply-suggestions"
          aria-label="Suggested replies"
        >
          {current.suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              className="reply-choice"
              type="button"
              disabled={disabled}
              onClick={() => onSelect(suggestion)}
            >
              {suggestion}
            </Suggestion>
          ))}
        </Suggestions>
      )}
    </div>
  );
}
