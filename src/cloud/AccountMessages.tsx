import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AnimatePresence } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Ellipsis,
  ArrowLeft,
} from "@/components/icons";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type {
  MessagesProps,
  ThreadRequest,
} from "../components/MessagesPage";
import InboxEmpty from "../components/InboxEmpty";
import {
  ChatPartner,
  ChatSegment,
  ChatThreadCard,
  InboxLoading,
  usePakoDrafts,
} from "../components/ChatParts";
import {
  useThreadDeal,
  type DealController,
  type ThreadEvent,
} from "../components/ThreadDeal";
import { useThreadPako } from "../components/ThreadPako";
import {
  CARD_IN_CONVERSATION,
  sendFailure,
  ThreadComposer,
  ThreadDisclosure,
  ThreadLog,
} from "../components/ThreadView";
import Pako from "../components/onboarding/Pako";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePageVisible } from "../hooks/usePageVisible";
import { accountInboxThread, isUnread } from "../inboxActivity";
import { newestAt } from "../inboxDeals";
import type { ThreadMessage } from "../pakoThread";
import { NO_TERMS } from "../dealOptions";
import { attachedTermsNote, threadDealNote } from "../dealWords";
import type { Conversation, Message } from "./client";
import { fail } from "./client";
import { sendAccountDeal } from "./deals";
import { sendCloudMessage } from "./messages";
import { accountTurnCache } from "./pakoDrafts";
import { PendingMessage } from "../pendingMessage";
import Report from "./Report";
import type { AccountInbox } from "./useAccountInbox";
import { useAccountDeal } from "./useAccountDeal";
import { useAccountThread } from "./useAccountThread";
import { threadDealSnapshot } from "../../shared/deal";
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
  initialTerms,
  offerRequest,
  homePoint,
  onListingStatus,
  onBeforeSend,
  onSent,
  onDeleted,
  threadRequest,
}: MessagesProps & {
  account: { client: SupabaseClient; session: Session };
  inbox: AccountInbox;
  threadRequest?: ThreadRequest;
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
  // A deal opened from elsewhere in the app, such as a seller's from Home, opens its own thread once.
  const openedThread = useRef<ThreadRequest>(undefined);
  useEffect(() => {
    if (
      !threadRequest ||
      openedThread.current === threadRequest ||
      !rows?.threads.some((thread) => thread.id === threadRequest.id)
    )
      return;
    openedThread.current = threadRequest;
    setSelected(threadRequest.id);
    const { id, draft } = threadRequest;
    if (draft) setDrafts((current) => ({ ...current, [id]: draft }));
  }, [threadRequest, rows]);
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
  const inQuery = (words: string) =>
    words.toLowerCase().includes(query.trim().toLowerCase());
  const visibleThreads = threads.filter((c) => {
    const item = listings.find((p) => p.id === c.listing_id);
    const other = c.buyer_id === userId ? c.seller_id : c.buyer_id;
    return (
      archived.includes(c.id) === showArchived &&
      (filter === "all" ||
        (filter === "buying"
          ? c.buyer_id === userId
          : c.seller_id === userId)) &&
      inQuery(`${names[other] ?? ""} ${item?.title ?? ""}`)
    );
  });
  const role = current?.seller_id === userId ? "seller" : "buyer";
  /** A conversation about to start is one of the student's purchases. */
  const newThreadShown =
    selected.startsWith("new:") &&
    product !== undefined &&
    !showArchived &&
    filter !== "selling" &&
    inQuery(`${otherName} ${product.title}`);
  const text = drafts[selected] ?? "";
  const setText = (value: string) =>
    setDrafts((xs) => ({ ...xs, [selected]: value }));
  const otherBlocked = !!otherId && blocked.includes(otherId);
  /** The demo listings belong to seeded sellers, who never reply. */
  const seededSeller = Boolean(product?.demo);
  // A message the app prepared, the opening offer or a follow-up, stays labelled as Pako's until the student edits it.
  const appDraft = [initialMessage, threadRequest?.draft].some(
    (draft) => draft !== undefined && text === draft,
  );
  /** Only the opening offer from the search chat carries terms. */
  const openingTerms =
    initialMessage !== undefined && text === initialMessage
      ? initialTerms
      : undefined;
  const pakoDrafts = usePakoDrafts();
  const thread = useAccountThread(client, current?.id);
  const deal = useAccountDeal(client, inbox, current?.id);
  const events: ThreadEvent[] = deal.events.map(
    ({ id, kind, terms, messageId, at }) => ({
      id,
      kind,
      terms,
      messageId,
      at,
    }),
  );
  const structured = new Set(events.map((event) => event.messageId));
  const messages: ThreadMessage[] = thread.messages.map((message) => ({
    id: message.id,
    from: fromSide(message, userId),
    text: message.body,
    at: message.created_at,
    ...(structured.has(message.id) ? { structured: true } : {}),
  }));
  const pageVisible = usePageVisible();
  const cardInConversation = useMediaQuery(CARD_IN_CONVERSATION);
  /** Another thread about the same listing in which the seller already agreed. */
  const agreedElsewhere =
    role === "seller" && current
      ? threads.find(
          (thread) =>
            thread.listing_id === current.listing_id &&
            thread.id !== current.id &&
            rows?.deals?.[thread.id]?.status === "agreed",
        )
      : undefined;
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
            loaded: thread.loaded && deal.loaded,
            deal: threadDealSnapshot(deal.deal, role),
            cache: accountTurnCache(client, userId, current.id),
          }
        : null,
    otherName,
    visible,
    text,
    onText: setText,
    canNudge: !seededSeller,
    agreedWith: agreedElsewhere && (names[agreedElsewhere.buyer_id] || "Buyer"),
  });
  /** A first offer starts the conversation, then records the offer with its message. */
  const controller: DealController = current
    ? deal
    : {
        ...deal,
        act: async (action, body, messageId) => {
          const conversation = await conversationFor(product!.id);
          const result = await sendAccountDeal(
            client,
            conversation.id,
            action,
            body,
            0,
            messageId,
          );
          setSelected(conversation.id);
          void inbox.refresh();
          window.dispatchEvent(
            new CustomEvent("takeover-message-sent", {
              detail: conversation.id,
            }),
          );
          return result;
        },
      };
  const threadDeal = useThreadDeal({
    threadKey: current?.id ?? selected,
    controller,
    role,
    otherName,
    listing: product,
    messages,
    events,
    turn: assistant.turn,
    enabled: !otherBlocked && !seededSeller,
    visible,
    homePoint,
    onStatusChange: onListingStatus,
    onWrite: setText,
  });
  // A listing's "Draft an offer" opens the offer card in its thread, once per tap.
  const offerOpened = useRef<number>(undefined);
  const offerThread =
    product?.id === listingId &&
    role === "buyer" &&
    controller.loaded &&
    threadDeal.open;
  const openOffer = useEffectEvent(() =>
    threadDeal.openOffer({ mode: "offer", terms: NO_TERMS }),
  );
  useEffect(() => {
    if (!offerRequest || offerOpened.current === offerRequest || !offerThread)
      return;
    offerOpened.current = offerRequest;
    openOffer();
  }, [offerRequest, offerThread]);
  // Terms travel with the text from Pako's option or the opening offer while the deal can take them.
  const attached = assistant.terms ?? openingTerms ?? null;
  const termsNote =
    attached && threadDeal.open && !deal.error
      ? attachedTermsNote(text, attached)
      : null;
  // Reading a thread covers the other side's newest message and news nobody wrote, such as another buyer's deal.
  const news = current && rows?.systemLatest[current.id];
  const seenUpTo = newestAt([
    [...messages].reverse().find((message) => message.from === "them")?.at,
    news && news.sender_id !== userId ? news.created_at : undefined,
  ]);
  useEffect(() => {
    if (visible && pageVisible && current && seenUpTo)
      void inbox.markRead(current.id, seenUpTo);
  }, [visible, pageVisible, current?.id, seenUpTo, inbox.markRead]);
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
    } catch {
      setError(
        remove
          ? "Couldn't archive this conversation. Try again."
          : "Couldn't restore this conversation. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleBlock(other: string) {
    setBusy(true);
    setError("");
    const isBlocked = blocked.includes(other);
    try {
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
    } catch {
      setError(
        `Couldn't ${isBlocked ? "unblock" : "block"} ${otherName}. Try again.`,
      );
    } finally {
      setBusy(false);
    }
  }
  /** A conversation this view started, until the inbox lists it. */
  const started = useRef<Conversation>(undefined);
  /** The conversation to write in: the open one, or a new one with this listing's seller. */
  async function conversationFor(itemId: string): Promise<Conversation> {
    if (current) return current;
    if (started.current?.listing_id === itemId) return started.current;
    const r = await client.rpc("start_conversation", { item: itemId });
    fail(r.error);
    const cs = await client
      .from("conversations")
      .select("*")
      .eq("id", r.data)
      .single();
    fail(cs.error);
    const conversation = cs.data as Conversation;
    started.current = conversation;
    inbox.change((rows) => ({
      ...rows,
      threads: [
        conversation,
        ...rows.threads.filter((x) => x.id !== conversation.id),
      ],
    }));
    return conversation;
  }
  /** A message without terms: the conversation's ordinary path. */
  async function sendPlain(conversation: Conversation) {
    const id = pending.current.idFor(conversation.id, role, text);
    await sendCloudMessage(client, {
      id,
      conversation_id: conversation.id,
      sender_id: userId,
      body: text.trim(),
    });
    pending.current.acknowledge(id);
    return id;
  }
  async function send() {
    const fromPako = appDraft || assistant.draftedByPako;
    const celebrates = Boolean(openingTerms) || assistant.celebrates;
    const withTerms = attached && termsNote?.states ? attached : null;
    setBusy(true);
    setError("");
    const key = selected;
    try {
      const itemId = current?.listing_id ?? product!.id;
      onBeforeSend?.(itemId, role);
      const conversation = await conversationFor(itemId);
      const id = withTerms
        ? await threadDeal.sendTerms(withTerms, text.trim())
        : await sendPlain(conversation);
      if (fromPako) pakoDrafts.remember(id);
      if (celebrates && !withTerms)
        threadDeal.celebrate({ kind: "sent", other: otherName });
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
      setError(sendFailure(err));
    } finally {
      setBusy(false);
    }
  }
  const threadNote = (c: Conversation, item: Product | undefined) => {
    const threadDealState = rows?.deals?.[c.id];
    const dealNote = threadDealNote(
      threadDealState,
      c.seller_id === userId ? "seller" : "buyer",
    );
    if (threadDealState?.status === "agreed") return dealNote;
    if (c.buyer_id === userId && item && item.status !== "active")
      return GONE_NOTES[item.status];
    const newest = latest[c.id];
    return (
      dealNote ??
      (newest && fromSide(newest, userId) === "them" ? "Your turn" : undefined)
    );
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
          {showArchived ? "Back to Messages" : "Archived"}
        </Button>
      </div>
      {rows && rows.reads === null && (
        <p className="account-notice" role="status">
          Pako can't read replies here yet. You can still send messages.
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
                  isUnread(
                    accountInboxThread(
                      c.id,
                      newest,
                      userId,
                      rows.systemLatest[c.id],
                    ),
                    rows.reads,
                  )
                }
                onSelect={() => {
                  setSelected(c.id);
                  setError("");
                }}
              />
            );
          })}
          {newThreadShown && product && (
            <ChatThreadCard
              order={visibleThreads.length}
              active
              image={product.image}
              name={otherName}
              title={product.title}
              note="New conversation"
            />
          )}
          {!rows && !inbox.loadError && <InboxLoading />}
          {rows &&
            !visibleThreads.length &&
            !newThreadShown &&
            (query || filter !== "all" || showArchived ? (
              <p>
                {query || filter !== "all"
                  ? "No matches. Try a different search or filter."
                  : "No archived conversations."}
              </p>
            ) : (
              <InboxEmpty onBrowse={onBrowse} />
            ))}
        </nav>
        <section
          className="seller-chat"
          aria-label={
            selected && (current || product)
              ? `Conversation with ${otherName}`
              : "Conversation"
          }
        >
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
                              ? `Unblock ${otherName}`
                              : `Block ${otherName}`}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </header>
              {!cardInConversation && threadDeal.card}
              <ThreadLog
                threadKey={current?.id ?? selected}
                messages={messages}
                otherName={otherName}
                loaded={thread.loaded}
                error={thread.error}
                drafted={pakoDrafts.drafted}
                events={events}
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
                after={
                  <>
                    {cardInConversation && threadDeal.card}
                    <AnimatePresence>{threadDeal.celebration}</AnimatePresence>
                    {!otherBlocked &&
                      !seededSeller &&
                      !threadDeal.celebrating &&
                      assistant.tray(threadDeal.trayMoment)}
                  </>
                }
              />
              {otherBlocked && (
                <p className="inbox-blocked-note" role="status">
                  You blocked this user. Unblock them to send a message.
                </p>
              )}
              {!otherBlocked && !seededSeller && deal.error && (
                <p className="chat-note" role="status">
                  {deal.error}
                </p>
              )}
              <ThreadComposer
                text={text}
                busy={busy}
                disabled={otherBlocked}
                error={error}
                pakoDrafted={appDraft || assistant.draftedByPako}
                tools={!otherBlocked && !seededSeller && assistant.askMenu}
                terms={termsNote}
                onTextChange={setText}
                onSend={() => void send()}
              />
              {threadDeal.editor}
            </>
          ) : (
            <div className="inbox-empty">
              <Pako mood="idle" size={88} />
              <h2>Your conversations</h2>
              <p>Choose a conversation.</p>
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
