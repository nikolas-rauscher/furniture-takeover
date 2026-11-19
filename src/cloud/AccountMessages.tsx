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
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  ArrowLeft,
} from "@/components/icons";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { MessagesProps } from "../components/MessagesPage";
import InboxEmpty from "../components/InboxEmpty";
import {
  ChatPartner,
  ChatSegment,
  ChatThreadCard,
  SentCelebration,
  usePakoDrafts,
  useSentCelebration,
} from "../components/ChatParts";
import { useThreadPako } from "../components/ThreadPako";
import {
  ThreadComposer,
  ThreadDisclosure,
  ThreadLog,
} from "../components/ThreadView";
import Pako from "../components/onboarding/Pako";
import { usePageVisible } from "../hooks/usePageVisible";
import { accountInboxThread, isUnread } from "../inboxActivity";
import type { ThreadMessage } from "../pakoThread";
import type { Conversation, Message } from "./client";
import { fail } from "./client";
import { sendCloudMessage } from "./messages";
import { accountTurnCache } from "./pakoDrafts";
import { PendingMessage } from "../pendingMessage";
import Report from "./Report";
import type { AccountInbox } from "./useAccountInbox";
import { useAccountThread } from "./useAccountThread";
import { money, type Product } from "../../shared/marketplace";
const FILTERS = [
  ["all", "All"],
  ["buying", "Buying"],
  ["selling", "Selling"],
] as const;
const STATUS_WORDS: Record<Product["status"], string> = {
  active: "Available",
  withdrawn: "Archived listing",
  reserved: "Reserved",
  sold: "Sold",
};
const GONE_NOTES: Record<Exclude<Product["status"], "active">, string> = {
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "No longer listed",
};

const fromSide = (message: Message, userId: string) =>
  message.sender_id === userId ? ("me" as const) : ("them" as const);

export default function AccountMessages({
  account,
  inbox,
  pako: reading,
  listingId,
  listing,
  listings,
  onOpenListing,
  onBrowse,
  initialMessage,
  onBeforeSend,
  onSent,
  onDeleted,
}: MessagesProps & {
  account: { client: SupabaseClient; session: Session };
  inbox: AccountInbox;
}) {
  const { client, session } = account,
    userId = session.user.id;
  const rows = inbox.rows;
  const threads = rows?.threads ?? [],
    latest = rows?.latest ?? {},
    archived = rows?.archived ?? [],
    blocked = rows?.blocked ?? [],
    names = rows?.names ?? {};
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | "buying" | "selling">("all"),
    [showArchived, setShowArchived] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [drafts, setDrafts] = useState<Record<string, string>>({});
  const pending = useRef(new PendingMessage());
  const requestedSelection = useRef({ listingId, initialMessage });
  const selectionDone = useRef(false);
  useEffect(() => {
    const previous = requestedSelection.current;
    if (
      previous.listingId === listingId &&
      previous.initialMessage === initialMessage
    )
      return;
    requestedSelection.current = { listingId, initialMessage };
    selectionDone.current = false;
  }, [listingId, initialMessage]);
  // Once the inbox has loaded, open the conversation the app asked for, or the newest one.
  useEffect(() => {
    if (!rows || selectionDone.current) return;
    selectionDone.current = true;
    const { listingId, initialMessage } = requestedSelection.current;
    const target = listingId
      ? rows.threads.find(
          (c) => c.listing_id === listingId && c.buyer_id === userId,
        )
      : rows.threads.find((c) => !rows.archived.includes(c.id));
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
  }, [rows, listingId, initialMessage, userId]);
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
  const setText = (value: string) =>
    setDrafts((xs) => ({ ...xs, [selected]: value }));
  const otherBlocked = !!otherId && blocked.includes(otherId);
  // The opening offer Pako prepared stays labelled as his until the student edits it.
  const offerDraft = Boolean(initialMessage) && text === initialMessage;
  const pakoDrafts = usePakoDrafts();
  const [celebration, setCelebration] = useSentCelebration();
  const thread = useAccountThread(client, current?.id);
  const messages: ThreadMessage[] = thread.messages.map((message) => ({
    id: message.id,
    from: fromSide(message, userId),
    text: message.body,
    at: message.created_at,
  }));
  const pageVisible = usePageVisible();
  const visible = Boolean(current);
  const assistant = useThreadPako({
    reading,
    thread:
      current && product
        ? {
            key: current.id,
            role,
            listing: product,
            messages,
            loaded: thread.loaded,
            cache: accountTurnCache(client, userId, current.id),
          }
        : null,
    otherName,
    visible,
    text,
    onText: setText,
    // Sample sellers never reply, so nudging them helps nobody.
    canNudge: !product?.demo,
  });
  const latestTheirs = [...messages]
    .reverse()
    .find((message) => message.from === "them");
  useEffect(() => {
    if (visible && pageVisible && current && latestTheirs)
      void inbox.markRead(current.id, latestTheirs.at);
  }, [visible, pageVisible, current?.id, latestTheirs?.at, inbox.markRead]);
  async function changeArchive(id: string, remove: boolean) {
    setBusy(true);
    setError("");
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
      inbox.change((rows) => ({
        ...rows,
        archived: remove
          ? [...rows.archived, id]
          : rows.archived.filter((x) => x !== id),
      }));
      if (remove) {
        setSelected("");
        if (current) onDeleted?.(current.listing_id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update conversation.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleBlock(other: string) {
    setBusy(true);
    setError("");
    try {
      const isBlocked = blocked.includes(other);
      const r = isBlocked
        ? await client
            .from("blocked_users")
            .delete()
            .eq("user_id", userId)
            .eq("blocked_id", other)
        : await client.from("blocked_users").insert({
            user_id: userId,
            blocked_id: other,
          });
      if (r.error?.code !== "23505") fail(r.error);
      inbox.change((rows) => ({
        ...rows,
        blocked: isBlocked
          ? rows.blocked.filter((x) => x !== other)
          : [...rows.blocked, other],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update block.");
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    const fromPako = offerDraft || assistant.draftedByPako;
    const celebrates = offerDraft || assistant.celebrates;
    setBusy(true);
    setError("");
    const key = selected;
    try {
      const itemId = current?.listing_id ?? product!.id;
      onBeforeSend?.(itemId, role);
      let conversation = current;
      if (!conversation) {
        const r = await client.rpc("start_conversation", { item: itemId });
        fail(r.error);
        const cs = await client
          .from("conversations")
          .select("*")
          .eq("id", r.data)
          .single();
        fail(cs.error);
        const started = cs.data as Conversation;
        conversation = started;
        inbox.change((rows) => ({
          ...rows,
          threads: [
            started,
            ...rows.threads.filter((x) => x.id !== started.id),
          ],
        }));
      }
      const id = pending.current.idFor(conversation.id, role, text);
      await sendCloudMessage(client, {
        id,
        conversation_id: conversation.id,
        sender_id: userId,
        body: text.trim(),
      });
      pending.current.acknowledge(id);
      if (fromPako) pakoDrafts.remember(id);
      if (celebrates) setCelebration(otherName);
      assistant.sent();
      onSent?.(itemId, role, text.trim());
      setDrafts((xs) => ({ ...xs, [key]: "", [conversation.id]: "" }));
      setSelected(conversation.id);
      await client
        .from("conversation_archives")
        .delete()
        .eq("conversation_id", conversation.id)
        .eq("user_id", userId);
      const sentTo = conversation.id;
      inbox.change((rows) => ({
        ...rows,
        archived: rows.archived.filter((x) => x !== sentTo),
      }));
      window.dispatchEvent(
        new CustomEvent("takeover-message-sent", { detail: conversation.id }),
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
  }
  const threadNote = (c: Conversation, item: Product | undefined) => {
    if (c.buyer_id === userId && item && item.status !== "active")
      return GONE_NOTES[item.status];
    const newest = latest[c.id];
    return newest && fromSide(newest, userId) === "them"
      ? "Your turn"
      : undefined;
  };
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
      {rows && rows.reads === null && (
        <p className="account-notice" role="status">
          Unread counts and Pako's reply reading arrive with this server's next
          update. Your messages work as before.
        </p>
      )}
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
              other = c.buyer_id === userId ? c.seller_id : c.buyer_id,
              newest = latest[c.id];
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
                  newest &&
                  `${newest.sender_id === userId ? "You: " : ""}${newest.body}`
                }
                note={threadNote(c, item)}
                unread={
                  rows?.reads != null &&
                  isUnread(accountInboxThread(c.id, newest, userId), rows.reads)
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
          {!rows && !inbox.loadError && (
            <div className="inbox-loading" role="status">
              <span className="sr-only">Loading conversations…</span>
              <div aria-hidden="true">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            </div>
          )}
          {rows &&
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
                      `${money(product.price)} · ${STATUS_WORDS[product.status]}`
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
                            onClick={() => void toggleBlock(otherId)}
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
              <ThreadLog
                threadKey={current?.id ?? selected}
                messages={messages}
                otherName={otherName}
                loaded={thread.loaded}
                error={thread.error}
                drafted={pakoDrafts.drafted}
                extras={(message) => (
                  <Report client={client} messageId={message.id} />
                )}
                disclosure={
                  current &&
                  product &&
                  reading.available === "ready" && (
                    <ThreadDisclosure
                      autoRead={reading.autoRead}
                      onOpenSettings={reading.onOpenSettings}
                    />
                  )
                }
              />
              <AnimatePresence>
                {celebration && <SentCelebration recipient={celebration} />}
              </AnimatePresence>
              {otherBlocked && (
                <p className="inbox-blocked-note" role="status">
                  You blocked this user. Unblock them to send a message.
                </p>
              )}
              {!otherBlocked && assistant.tray}
              <ThreadComposer
                text={text}
                busy={busy}
                disabled={otherBlocked}
                error={error}
                pakoDrafted={offerDraft || assistant.draftedByPako}
                tools={!otherBlocked && assistant.askMenu}
                onTextChange={setText}
                onSend={() => void send()}
              />
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
      {inbox.loadError && (
        <p role="alert">
          {inbox.loadError}{" "}
          <Button className="text-button" onClick={() => void inbox.refresh()}>
            Retry
          </Button>
        </p>
      )}
      {inbox.readError && <p role="alert">{inbox.readError}</p>}
      {error && !selected && <p role="alert">{error}</p>}
    </section>
  );
}
