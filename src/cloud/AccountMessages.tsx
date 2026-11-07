import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Send,
  MessageCircle,
} from "lucide-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { MessagesPageProps } from "../components/MessagesPage";
import type { Conversation, Message } from "./client";
import { fail } from "./client";
import { sendCloudMessage } from "./messages";
import { PendingMessage } from "../pendingMessage";
import { motionBehavior } from "../uiMotion";
import Report from "./Report";
import ReplySuggestions from "./ReplySuggestions";
import { money } from "../../shared/marketplace";
export default function AccountMessages({
  account,
  listingId,
  listing,
  listings,
  onOpenListing,
  initialMessage,
  onBeforeSend,
  onSent,
  onDeleted,
}: MessagesPageProps & {
  account: { client: SupabaseClient; session: Session };
}) {
  const { client, session } = account,
    userId = session.user.id;
  const [threads, setThreads] = useState<Conversation[]>([]),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | "buying" | "selling">("all"),
    [latest, setLatest] = useState<Record<string, Message>>({}),
    [conversationLatest, setConversationLatest] = useState<
      Record<string, string>
    >({}),
    [archived, setArchived] = useState<string[]>([]),
    [showArchived, setShowArchived] = useState(false),
    [blocked, setBlocked] = useState<string[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [drafts, setDrafts] = useState<Record<string, string>>({});
  const mounted = useRef(true),
    inFlight = useRef(false),
    initialSelection = useRef(false),
    generation = useRef(0),
    pending = useRef(new PendingMessage());
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const token = generation.current;
    try {
      const [cs, as, bs, ms] = await Promise.all([
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
      ]);
      fail(cs.error);
      fail(as.error);
      fail(bs.error);
      fail(ms.error);
      const previews: Record<string, Message> = {};
      for (const message of (ms.data ?? []) as Message[])
        previews[message.conversation_id] ??= message;
      const rows = cs.data as Conversation[],
        ids = [...new Set(rows.flatMap((c) => [c.buyer_id, c.seller_id]))];
      const profiles = ids.length
        ? await client.from("profiles").select("*").in("id", ids)
        : { data: [], error: null };
      fail(profiles.error);
      if (mounted.current && generation.current === token) {
        setThreads(
          rows.sort((a, b) =>
            (previews[b.id]?.created_at ?? b.created_at).localeCompare(
              previews[a.id]?.created_at ?? a.created_at,
            ),
          ),
        );
        setLatest(previews);
        setArchived(as.data!.map((x) => x.conversation_id));
        setBlocked(bs.data!.map((x) => x.blocked_id));
        setNames(
          Object.fromEntries(
            (profiles.data ?? []).map((x) => [x.id, x.display_name]),
          ),
        );
        setLoaded(true);
        setLoadError("");
        if (!initialSelection.current) {
          initialSelection.current = true;
          const target = listingId
            ? rows.find(
                (c) => c.listing_id === listingId && c.buyer_id === userId,
              )
            : rows.find(
                (c) => !as.data!.some((a) => a.conversation_id === c.id),
              );
          setSelected(target?.id ?? (listingId ? `new:${listingId}` : ""));
          if (initialMessage)
            setDrafts({ [target?.id ?? `new:${listingId}`]: initialMessage });
        }
      }
    } catch (err) {
      if (mounted.current)
        setLoadError(
          err instanceof Error ? err.message : "Could not load messages.",
        );
    } finally {
      inFlight.current = false;
    }
  }, [client, userId, listingId, initialMessage]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
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
    return () => {
      mounted.current = false;
      clearInterval(timer);
      void client.removeChannel(channel);
    };
  }, [client, userId, refresh]);
  const onLatestMessage = useCallback((id: string, messageId: string) => {
    setConversationLatest((previous) =>
      previous[id] === messageId ? previous : { ...previous, [id]: messageId },
    );
  }, []);
  const current = threads.find((c) => c.id === selected);
  const product = current
    ? listings.find((p) => p.id === current.listing_id)
    : selected === `new:${listingId}`
      ? listing
      : undefined;
  const otherId = current
    ? current.buyer_id === userId
      ? current.seller_id
      : current.buyer_id
    : undefined;
  const rawOtherName = otherId
    ? names[otherId] || (current?.buyer_id === userId ? "Seller" : "Buyer")
    : (product?.seller ?? "Seller");
  const otherName = product?.demo
    ? rawOtherName.replace(/^Demo Seller — /, "")
    : rawOtherName;
  const visibleThreads = threads.filter((c) => {
    const item = listings.find((p) => p.id === c.listing_id);
    const other = c.buyer_id === userId ? c.seller_id : c.buyer_id;
    return (
      archived.includes(c.id) === showArchived &&
      (filter === "all" ||
        (filter === "buying"
          ? c.buyer_id === userId
          : c.seller_id === userId)) &&
      `${names[other] ?? ""} ${item?.title ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  });
  const role = current?.seller_id === userId ? "seller" : "buyer";
  const text = drafts[selected] ?? "";
  const thumbnail = (image?: string, title = "") =>
    image ? (
      <img className="chat-item-thumbnail" src={image} alt={title} />
    ) : (
      <span className="chat-item-thumbnail chat-item-placeholder">
        <ImageIcon size={22} />
      </span>
    );
  async function changeArchive(id: string, remove: boolean) {
    setBusy(true);
    setError("");
    generation.current++;
    try {
      const r = remove
        ? await client
            .from("conversation_archives")
            .insert({ conversation_id: id, user_id: userId })
        : await client
            .from("conversation_archives")
            .delete()
            .eq("conversation_id", id)
            .eq("user_id", userId);
      if (r.error?.code !== "23505") fail(r.error);
      setArchived((xs) => (remove ? [...xs, id] : xs.filter((x) => x !== id)));
      if (remove) {
        setSelected("");
        if (current) onDeleted?.(current.listing_id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update conversation.",
      );
    } finally {
      generation.current++;
      setBusy(false);
    }
  }
  return (
    <section
      className={`messages-page account-messages${selected ? " has-conversation" : ""}`}
      aria-label="Messages page"
    >
      <div className="page-title">
        <h1>Messages</h1>
        <p>Talk to sellers and arrange your pickup.</p>
      </div>
      <div className="account-inbox-notice">
        <p className="quiet-caption">
          Your conversations with buyers and sellers.
        </p>
        <button
          className="text-button"
          onClick={() => {
            setShowArchived((v) => !v);
            setSelected("");
            setError("");
          }}
        >
          {showArchived ? "Back to inbox" : "Archived"}
        </button>
      </div>
      <div className="seller-chat-layout">
        <nav aria-label="Conversations">
          <div className="inbox-controls">
            <input
              type="search"
              placeholder="Search conversations"
              aria-label="Search conversations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="inbox-filters" aria-label="Conversation filters">
              {(
                [
                  ["all", "All"],
                  ["buying", "Buying"],
                  ["selling", "Selling"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {visibleThreads.map((c) => {
            const item = listings.find((l) => l.id === c.listing_id),
              other = c.buyer_id === userId ? c.seller_id : c.buyer_id;
            return (
              <button
                className={`chat-thread ${selected === c.id ? "active" : ""}`}
                key={c.id}
                disabled={busy}
                onClick={() => {
                  setSelected(c.id);
                  setError("");
                }}
              >
                {thumbnail(item?.image, item?.title)}
                <span className="chat-thread-copy">
                  <strong>
                    {(item?.demo
                      ? names[other]?.replace(/^Demo Seller — /, "")
                      : names[other]) ||
                      (c.buyer_id === userId ? "Seller" : "Buyer")}
                  </strong>
                  <span>{item?.title ?? "Listing unavailable"}</span>
                  {latest[c.id] && (
                    <small className="thread-preview">
                      {latest[c.id].sender_id === userId ? "You: " : ""}
                      {latest[c.id].body}
                    </small>
                  )}
                </span>
              </button>
            );
          })}
          {selected.startsWith("new:") && product && (
            <button className="chat-thread active">
              {thumbnail(product.image, product.title)}
              <span className="chat-thread-copy">
                <strong>{otherName}</strong>
                <span>{product.title}</span>
                <small>New conversation</small>
              </span>
            </button>
          )}
          {!loaded && !loadError && <p>Loading conversations…</p>}
          {loaded && !visibleThreads.length && !selected.startsWith("new:") && (
            <p>
              {query || filter !== "all"
                ? "No conversations match this filter."
                : showArchived
                  ? "No archived conversations."
                  : "No conversations yet. Open a listing and choose Message seller."}
            </p>
          )}
        </nav>
        <section className="seller-chat" aria-label="Seller conversation">
          {selected && (current || product) ? (
            <>
              <header>
                <div className="chat-header-item">
                  <button
                    className="icon-button inbox-back"
                    aria-label="Back to conversations"
                    onClick={() => {
                      setSelected("");
                      setError("");
                    }}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  {thumbnail(product?.image, product?.title)}
                  <div className="chat-header-copy">
                    <strong>{otherName}</strong>
                    <button
                      className="chat-listing-link"
                      onClick={() =>
                        onOpenListing(current?.listing_id ?? product!.id)
                      }
                    >
                      {product?.title ?? "Listing unavailable"} ↗
                    </button>
                    {product && (
                      <small>
                        {money(product.price)} ·{" "}
                        {product.status === "active"
                          ? "Available"
                          : product.status === "withdrawn"
                            ? "Archived listing"
                            : product.status === "reserved"
                              ? "Reserved"
                              : "Sold"}
                      </small>
                    )}
                  </div>
                  {current && (
                    <button
                      className="chat-delete-button"
                      aria-label={
                        archived.includes(current.id)
                          ? "Restore conversation"
                          : "Archive conversation"
                      }
                      disabled={busy}
                      onClick={() =>
                        void changeArchive(
                          current.id,
                          !archived.includes(current.id),
                        )
                      }
                    >
                      {archived.includes(current.id) ? (
                        <ArchiveRestore size={18} />
                      ) : (
                        <Archive size={18} />
                      )}
                    </button>
                  )}
                </div>
                {otherId && (
                  <details className="account-message-tools">
                    <summary>Conversation options</summary>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        generation.current++;
                        try {
                          const isBlocked = blocked.includes(otherId);
                          const r = isBlocked
                            ? await client
                                .from("blocked_users")
                                .delete()
                                .eq("user_id", userId)
                                .eq("blocked_id", otherId)
                            : await client.from("blocked_users").insert({
                                user_id: userId,
                                blocked_id: otherId,
                              });
                          if (r.error?.code !== "23505") fail(r.error);
                          setBlocked((xs) =>
                            isBlocked
                              ? xs.filter((x) => x !== otherId)
                              : [...xs, otherId],
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Could not update block.",
                          );
                        } finally {
                          generation.current++;
                          setBusy(false);
                        }
                      }}
                    >
                      {blocked.includes(otherId)
                        ? "Unblock user"
                        : "Block user"}
                    </button>
                  </details>
                )}
              </header>
              <ConversationMessages
                key={current?.id ?? selected}
                client={client}
                userId={userId}
                conversationId={current?.id}
                otherName={otherName}
                onLatestMessage={onLatestMessage}
              />
              {otherId && blocked.includes(otherId) && (
                <p className="inbox-blocked-note" role="status">
                  You blocked this user. Unblock them to send a message.
                </p>
              )}
              <form
                className="conversation-composer"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    busy ||
                    !text.trim() ||
                    (!!otherId && blocked.includes(otherId))
                  )
                    return;
                  setBusy(true);
                  setError("");
                  const key = selected;
                  try {
                    const itemId = current?.listing_id ?? product!.id;
                    onBeforeSend?.(itemId, role);
                    let thread = current;
                    if (!thread) {
                      const r = await client.rpc("start_conversation", {
                        item: itemId,
                      });
                      fail(r.error);
                      const cs = await client
                        .from("conversations")
                        .select("*")
                        .eq("id", r.data)
                        .single();
                      fail(cs.error);
                      thread = cs.data as Conversation;
                      setThreads((xs) => [
                        thread!,
                        ...xs.filter((x) => x.id !== thread!.id),
                      ]);
                    }
                    const id = pending.current.idFor(thread.id, role, text);
                    await sendCloudMessage(client, {
                      id,
                      conversation_id: thread.id,
                      sender_id: userId,
                      body: text.trim(),
                    });
                    pending.current.acknowledge(id);
                    onSent?.(itemId, role, text.trim());
                    setDrafts((xs) => ({ ...xs, [key]: "", [thread!.id]: "" }));
                    setSelected(thread.id);
                    await client
                      .from("conversation_archives")
                      .delete()
                      .eq("conversation_id", thread.id)
                      .eq("user_id", userId);
                    setArchived((xs) => xs.filter((x) => x !== thread!.id));
                    window.dispatchEvent(
                      new CustomEvent("takeover-message-sent", {
                        detail: thread.id,
                      }),
                    );
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Could not send message. Your text is kept.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <ReplySuggestions
                  key={selected}
                  client={client}
                  userId={userId}
                  conversationId={current?.id}
                  role={role}
                  listing={product}
                  latestMessageKey={`${latest[selected]?.id ?? ""}:${conversationLatest[selected] ?? ""}`}
                  draft={text}
                  disabled={busy || (!!otherId && blocked.includes(otherId))}
                  onSelect={(reply) => {
                    if (reply.length > 4000) return;
                    setDrafts((xs) => ({ ...xs, [selected]: reply }));
                  }}
                />
                <textarea
                  aria-label="Message"
                  placeholder="Write a message…"
                  maxLength={4000}
                  rows={2}
                  value={text}
                  disabled={busy || (!!otherId && blocked.includes(otherId))}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      (e.ctrlKey || e.metaKey) &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  onChange={(e) =>
                    setDrafts((xs) => ({ ...xs, [selected]: e.target.value }))
                  }
                />
                <div className="composer-actions">
                  <small>
                    {text.length}/4,000
                    <span className="composer-keyboard-hint">
                      {" "}
                      · Ctrl / ⌘ + Enter to send
                    </span>
                  </small>
                  <button
                    className="button primary"
                    disabled={
                      busy ||
                      !text.trim() ||
                      (!!otherId && blocked.includes(otherId))
                    }
                  >
                    <Send size={15} /> {busy ? "Sending…" : "Send"}
                  </button>
                </div>
                {error && (
                  <p className="account-chat-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="inbox-empty">
              <MessageCircle size={32} />
              <h2>Your conversations</h2>
              <p>Choose a conversation to discuss an item or arrange pickup.</p>
            </div>
          )}
        </section>
      </div>
      {loadError && (
        <p role="alert">
          {loadError}{" "}
          <button className="text-button" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}
      {error && !selected && <p role="alert">{error}</p>}
    </section>
  );
}
function ConversationMessages({
  client,
  userId,
  conversationId,
  otherName,
  onLatestMessage,
}: {
  client: SupabaseClient;
  userId: string;
  conversationId?: string;
  otherName: string;
  onLatestMessage: (conversationId: string, messageId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [error, setError] = useState("");
  const pane = useRef<HTMLDivElement>(null),
    follow = useRef(true);
  useEffect(() => {
    if (!conversationId) return;
    let alive = true,
      loading = false;
    async function load() {
      if (loading) return;
      loading = true;
      try {
        const rows: Message[] = [];
        for (let from = 0; ; from += 500) {
          const result = await client
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId!)
            .order("created_at")
            .order("id")
            .range(from, from + 499);
          fail(result.error);
          rows.push(...(result.data as Message[]));
          if (result.data!.length < 500) break;
        }
        if (alive) {
          setMessages(rows);
          onLatestMessage(conversationId!, rows.at(-1)?.id ?? "");
          setError("");
        }
      } catch (err) {
        if (alive)
          setError(
            err instanceof Error ? err.message : "Could not load conversation.",
          );
      } finally {
        loading = false;
      }
    }
    const refresh = () => void load();
    void load();
    const timer = setInterval(refresh, 5000);
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
        (payload) => {
          if (typeof payload.new.id === "string")
            onLatestMessage(conversationId, payload.new.id);
          refresh();
        },
      )
      .subscribe();
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("takeover-message-sent", refresh);
      void client.removeChannel(channel);
    };
  }, [client, conversationId, onLatestMessage]);
  useEffect(() => {
    const el = pane.current;
    if (el && follow.current)
      el.scrollTo({ top: el.scrollHeight, behavior: motionBehavior() });
  }, [messages.length]);
  return (
    <div
      className="seller-chat-messages"
      ref={pane}
      onScroll={() => {
        const el = pane.current!;
        follow.current = el.scrollHeight - el.clientHeight - el.scrollTop < 72;
      }}
      role="log"
      aria-live="polite"
    >
      {!messages.length && !error && (
        <p className="chat-start-note">
          Ask about this item or propose a pickup time. Your message will appear
          here once sent.
        </p>
      )}
      {messages.map((m, index) => (
        <div className="message-entry" key={m.id}>
          {(index === 0 ||
            new Date(messages[index - 1].created_at).toDateString() !==
              new Date(m.created_at).toDateString()) && (
            <div className="chat-date">
              {new Date(m.created_at).toLocaleDateString([], {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
          <div
            key={m.id}
            className={`chat-bubble ${m.sender_id === userId ? "mine" : ""}`}
          >
            <small>{m.sender_id === userId ? "You" : otherName}</small>
            <p>{m.body}</p>
            <time dateTime={m.created_at}>
              {new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            {m.sender_id !== userId && (
              <Report client={client} messageId={m.id} />
            )}
          </div>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
