import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  ArrowLeft,
} from "@/components/icons";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { MessagesPageProps } from "../components/MessagesPage";
import InboxEmpty from "../components/InboxEmpty";
import {
  ChatComposerField,
  ChatDate,
  ChatMessage,
  ChatPartner,
  ChatSegment,
  ChatStart,
  ChatThreadCard,
  PakoLabel,
  SentCelebration,
  startsNewDay,
  usePakoDrafts,
  useSentCelebration,
  type PakoDrafts,
} from "../components/ChatParts";
import Pako from "../components/onboarding/Pako";
import type { Conversation, Message } from "./client";
import { fail } from "./client";
import { sendCloudMessage } from "./messages";
import { PendingMessage } from "../pendingMessage";
import { motionBehavior } from "../uiMotion";
import Report from "./Report";
import ReplySuggestions from "./ReplySuggestions";
import { money } from "../../shared/marketplace";
const FILTERS = [
  ["all", "All"],
  ["buying", "Buying"],
  ["selling", "Selling"],
] as const;
export default function AccountMessages({
  account,
  listingId,
  listing,
  listings,
  onOpenListing,
  onBrowse,
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
  const requestedSelection = useRef({ listingId, initialMessage });
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
          const { listingId, initialMessage } = requestedSelection.current;
          const target = listingId
            ? rows.find(
                (c) => c.listing_id === listingId && c.buyer_id === userId,
              )
            : rows.find(
                (c) => !as.data!.some((a) => a.conversation_id === c.id),
              );
          setSelected(
            !listingId && window.matchMedia("(max-width: 760px)").matches
              ? ""
              : (target?.id ?? (listingId ? `new:${listingId}` : "")),
          );
          if (initialMessage)
            setDrafts((current) => ({
              ...current,
              [target?.id ?? `new:${listingId}`]: initialMessage,
            }));
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
  }, [client, userId]);
  useEffect(() => {
    const previous = requestedSelection.current;
    if (
      previous.listingId === listingId &&
      previous.initialMessage === initialMessage
    )
      return;
    requestedSelection.current = { listingId, initialMessage };
    initialSelection.current = false;
    void refresh();
  }, [listingId, initialMessage, refresh]);
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
  const otherBlocked = !!otherId && blocked.includes(otherId);
  // A draft Pako prepared stays labelled as his until the visitor edits it.
  const pakoDraft = Boolean(initialMessage) && text === initialMessage;
  const pakoDrafts = usePakoDrafts();
  const [celebration, setCelebration] = useSentCelebration();
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
      <div className="page-title title-with-action">
        <h1>Messages</h1>
        <Button
          className="text-button"
          onClick={() => {
            setShowArchived((value) => !value);
            setSelected("");
            setError("");
          }}
        >
          {showArchived ? "Back to inbox" : "Archived"}
        </Button>
      </div>
      <div className="seller-chat-layout">
        <nav aria-label="Conversations">
          <div className="inbox-controls">
            <Input
              type="search"
              placeholder="Search conversations"
              aria-label="Search conversations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ChatSegment
              label="Conversation filters"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          </div>
          {visibleThreads.map((c, order) => {
            const item = listings.find((l) => l.id === c.listing_id),
              other = c.buyer_id === userId ? c.seller_id : c.buyer_id;
            return (
              <ChatThreadCard
                key={c.id}
                order={order}
                active={selected === c.id}
                disabled={busy}
                image={item?.image}
                name={
                  (item?.demo
                    ? names[other]?.replace(/^Demo Seller — /, "")
                    : names[other]) ||
                  (c.buyer_id === userId ? "Seller" : "Buyer")
                }
                title={item?.title ?? "Listing unavailable"}
                preview={
                  latest[c.id] &&
                  `${latest[c.id].sender_id === userId ? "You: " : ""}${latest[c.id].body}`
                }
                onSelect={() => {
                  setSelected(c.id);
                  setError("");
                }}
              />
            );
          })}
          {selected.startsWith("new:") && product && (
            <ChatThreadCard
              order={visibleThreads.length}
              active
              image={product.image}
              name={otherName}
              title={product.title}
              note="New conversation"
            />
          )}
          {!loaded && !loadError && (
            <div className="inbox-loading" role="status">
              <span className="sr-only">Loading conversations…</span>
              <div aria-hidden="true">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            </div>
          )}
          {loaded &&
            !visibleThreads.length &&
            !selected.startsWith("new:") &&
            (query || filter !== "all" || showArchived ? (
              <p>
                {query || filter !== "all"
                  ? "No conversations match this filter."
                  : "No archived conversations."}
              </p>
            ) : (
              <InboxEmpty onBrowse={onBrowse} />
            ))}
        </nav>
        <section className="seller-chat" aria-label="Seller conversation">
          {selected && (current || product) ? (
            <>
              <header>
                <div className="chat-header-item">
                  <Button
                    className="icon-button inbox-back"
                    aria-label="Back to conversations"
                    onClick={() => {
                      setSelected("");
                      setError("");
                    }}
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  <ChatPartner
                    name={otherName}
                    image={product?.image}
                    title={product?.title ?? "Listing unavailable"}
                    detail={
                      product &&
                      `${money(product.price)} · ${
                        product.status === "active"
                          ? "Available"
                          : product.status === "withdrawn"
                            ? "Archived listing"
                            : product.status === "reserved"
                              ? "Reserved"
                              : "Sold"
                      }`
                    }
                    onOpenListing={() =>
                      onOpenListing(current?.listing_id ?? product!.id)
                    }
                  />
                  {(current || otherId) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" />}
                        aria-label="Conversation options"
                        disabled={busy}
                      >
                        <Ellipsis size={20} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {current && (
                          <DropdownMenuItem
                            onClick={() =>
                              void changeArchive(
                                current.id,
                                !archived.includes(current.id),
                              )
                            }
                          >
                            {archived.includes(current.id) ? (
                              <ArchiveRestore size={16} />
                            ) : (
                              <Archive size={16} />
                            )}
                            {archived.includes(current.id)
                              ? "Restore conversation"
                              : "Archive conversation"}
                          </DropdownMenuItem>
                        )}
                        {current && otherId && <DropdownMenuSeparator />}
                        {otherId && (
                          <DropdownMenuItem
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
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </header>
              <ConversationMessages
                key={current?.id ?? selected}
                client={client}
                userId={userId}
                conversationId={current?.id}
                otherName={otherName}
                pakoDrafts={pakoDrafts}
                onLatestMessage={onLatestMessage}
              />
              <AnimatePresence>
                {celebration && <SentCelebration recipient={celebration} />}
              </AnimatePresence>
              {otherBlocked && (
                <p className="inbox-blocked-note" role="status">
                  You blocked this user. Unblock them to send a message.
                </p>
              )}
              <form
                className="conversation-composer"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy || !text.trim() || otherBlocked) return;
                  const fromPako = pakoDraft;
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
                    if (fromPako) {
                      pakoDrafts.remember(id);
                      setCelebration(otherName);
                    }
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
                  disabled={busy || otherBlocked}
                  onSelect={(reply) => {
                    if (reply.length > 4000) return;
                    setDrafts((xs) => ({ ...xs, [selected]: reply }));
                  }}
                />
                {pakoDraft && (
                  <PakoLabel>
                    Pako drafted this for you. Check it, then send.
                  </PakoLabel>
                )}
                <ChatComposerField
                  value={text}
                  disabled={otherBlocked}
                  busy={busy}
                  onValueChange={(value) =>
                    setDrafts((xs) => ({ ...xs, [selected]: value }))
                  }
                />
                <div className="seller-message-meta">
                  <small className="composer-keyboard-hint">
                    Ctrl / ⌘ + Enter to send
                  </small>
                  {text.length >= 3500 && (
                    <small>{text.length.toLocaleString()}/4,000</small>
                  )}
                </div>
                {error && (
                  <p className="chat-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="inbox-empty">
              <Pako mood="idle" size={88} />
              <h2>Your conversations</h2>
              <p>Choose a conversation to discuss an item or arrange pickup.</p>
            </div>
          )}
        </section>
      </div>
      {loadError && (
        <p role="alert">
          {loadError}{" "}
          <Button className="text-button" onClick={() => void refresh()}>
            Retry
          </Button>
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
  pakoDrafts,
  onLatestMessage,
}: {
  client: SupabaseClient;
  userId: string;
  conversationId?: string;
  otherName: string;
  pakoDrafts: PakoDrafts;
  onLatestMessage: (conversationId: string, messageId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [error, setError] = useState(""),
    // A new conversation has nothing to load; history arrives without an entrance.
    [loaded, setLoaded] = useState(!conversationId);
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
          setLoaded(true);
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
      {loaded && !messages.length && !error && <ChatStart />}
      {loaded && (
        <AnimatePresence initial={false}>
          {messages.map((m, index) => (
            <div className="message-entry" key={m.id}>
              {startsNewDay(m.created_at, messages[index - 1]?.created_at) && (
                <ChatDate createdAt={m.created_at} />
              )}
              <ChatMessage
                mine={m.sender_id === userId}
                drafted={m.sender_id === userId && pakoDrafts.drafted(m.id)}
                author={m.sender_id === userId ? "You" : otherName}
                createdAt={m.created_at}
                text={m.body}
              >
                {m.sender_id !== userId && (
                  <Report client={client} messageId={m.id} />
                )}
              </ChatMessage>
            </div>
          ))}
        </AnimatePresence>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
