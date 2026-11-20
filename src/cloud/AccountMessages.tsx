import { cardImageFor } from "../../shared/listingPhotos";
import { useEffect, useRef, useState } from "react";
import type { InboxView } from "../api/inbox";
import type { MessagesProps, ThreadRequest } from "../components/messagesProps";
import Messages from "../components/Messages";
import {
  useMessagesState,
  type InboxFilter,
  type MessagesModel,
  type ThreadRow,
} from "../components/messagesModel";
import type { DealController, ThreadEvent } from "../components/ThreadDeal";
import { useNow } from "../hooks/useNow";
import { accountInboxThread, isUnread } from "../inboxActivity";
import type { ThreadMessage } from "../pakoThread";
import { threadDealNote } from "../dealWords";
import type { Conversation, Message } from "./client";
import { useMarketplaceData } from "../marketplaceData";
import { PendingMessage } from "../pendingMessage";
import Report from "./Report";
import { useAccountDeal } from "./useAccountDeal";
import { useAccountThread } from "./useAccountThread";
import { nextPickupBuyer, threadDealSnapshot } from "../../shared/deal";
import { availableAgainMessage } from "../../shared/dealMessages";
import { money, type Product } from "../../shared/marketplace";

type AccountMessagesProps = MessagesProps &
  Extract<InboxView, { mode: "account" }> & {
    threadRequest?: ThreadRequest;
  };

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

/** The demo listings belong to seeded sellers, whose names carry this prefix. */
const withoutDemoPrefix = (name: string) => name.replace(/^Demo Seller — /, "");

/** Messages for a signed-in student. */
export default function AccountMessages(props: AccountMessagesProps) {
  const model = useAccountMessages(props);
  return <Messages app={props} model={model} />;
}

/** The signed-in inbox: server conversations with search, archive, blocking and reports. */
function useAccountMessages({
  client,
  inbox,
  source,
  listingId,
  listing,
  listings,
  onOpenListing,
  initialMessage,
  onDeleted,
  onThreadOpened,
  threadRequest,
}: AccountMessagesProps): MessagesModel {
  const { userId } = source;
  const dealApi = useMarketplaceData().deals;
  const rows = inbox.rows;
  const threads = rows?.threads ?? [],
    latest = rows?.latest ?? {},
    archived = rows?.archived ?? [],
    blocked = rows?.blocked ?? [],
    names = rows?.names ?? {};
  const state = useMessagesState({});
  const { setDrafts, setBusy, setError } = state;
  const [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<InboxFilter>("all"),
    [showArchived, setShowArchived] = useState(false);
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
  }, [threadRequest, rows, setDrafts]);
  // Once the inbox has loaded, open the conversation the app asked for, or the newest one.
  useEffect(() => {
    if (!rows || selectionDone.current) return;
    selectionDone.current = true;
    const { listingId, initialMessage } = requestedSelection.current;
    // The address names a thread opened from the list, or a listing the student asked about.
    const target = listingId
      ? rows.threads.find(
          (c) =>
            c.id === listingId ||
            (c.listing_id === listingId && c.buyer_id === userId),
        )
      : rows.threads.find((c) => !rows.archived.includes(c.id));
    setSelected(
      !listingId && window.matchMedia("(max-width: 760px)").matches
        ? ""
        : (target?.id ?? (listingId ? `new:${listingId}` : "")),
    );
    if (listingId && initialMessage)
      setDrafts((current) => ({
        ...current,
        [target?.id ?? `new:${listingId}`]: initialMessage,
      }));
  }, [rows, listingId, initialMessage, userId, setDrafts]);
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
    ? withoutDemoPrefix(rawOtherName)
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
  const otherBlocked = !!otherId && blocked.includes(otherId);
  /** The demo listings belong to seeded sellers, who never reply. */
  const seededSeller = Boolean(product?.demo);
  const thread = useAccountThread(source, current?.id);
  const deal = useAccountDeal(inbox, current?.id, role);
  const events: ThreadEvent[] = [
    ...deal.events.map(({ id, kind, terms, messageId, at }) => ({
      id,
      kind,
      terms,
      messageId,
      at,
    })),
    ...deal.pickupEvents.map(
      ({ id, kind, terms, minutes, messageId, actorRole, at }) => ({
        id,
        kind,
        terms,
        minutes,
        messageId,
        actor: actorRole,
        at,
      }),
    ),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const structured = new Set(events.map((event) => event.messageId));
  const messages: ThreadMessage[] = thread.messages.map((message) => ({
    id: message.id,
    from: fromSide(message, userId),
    text: message.body,
    at: message.created_at,
    ...(structured.has(message.id) ? { structured: true } : {}),
  }));
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
  const now = useNow();
  /** After a released pickup, the next buyer in the inbox who wrote about the listing. */
  const released =
    role === "seller" && product?.status === "active" ? current : undefined;
  const releasedDeal = released && rows?.deals?.[released.id];
  const nextThread =
    releasedDeal &&
    nextPickupBuyer(
      releasedDeal,
      threads
        .filter(
          (thread) =>
            latest[thread.id] &&
            !archived.includes(thread.id) &&
            !blocked.includes(thread.buyer_id),
        )
        .map((thread) => ({
          id: thread.id,
          listingId: thread.listing_id,
          buyerId: thread.buyer_id,
          deal: rows?.deals?.[thread.id],
        })),
    );
  const nextBuyer = released &&
    nextThread &&
    product && {
      name: names[nextThread.buyerId] || "Buyer",
      onOffer: () => {
        state.offerAgainIn(nextThread.id, {
          threadKey: nextThread.id,
          releasedConversationId: released.id,
          draft: availableAgainMessage(product.title),
        });
        setSelected(nextThread.id);
      },
    };
  /** A first offer starts the conversation, then records the offer with its message. */
  const controller: DealController = current
    ? deal
    : {
        ...deal,
        act: async (action, body, messageId) => {
          const conversation = await conversationFor(product!.id);
          const result = await dealApi.submit(
            { conversationId: conversation.id, role },
            { action, text: body, expectedVersion: 0, messageId },
          );
          setSelected(conversation.id);
          void inbox.refresh();
          announceSent(conversation.id);
          return result;
        },
      };
  async function changeArchive(id: string, remove: boolean) {
    setBusy(true);
    setError("");
    try {
      await source.archive(id, remove);
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
      await source.block(other, isBlocked);
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
    const conversation = await source.start(itemId);
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
  async function sendPlain(itemId: string, text: string) {
    const conversation = await conversationFor(itemId);
    const id = pending.current.idFor(conversation.id, role, text);
    await source.send({
      id,
      conversation_id: conversation.id,
      sender_id: userId,
      body: text.trim(),
    });
    pending.current.acknowledge(id);
    return id;
  }
  /** A sent message moves the draft to its conversation and brings that conversation back from the archive. */
  async function afterSend(itemId: string) {
    const { id } = await conversationFor(itemId);
    setDrafts((items) => ({ ...items, [id]: "" }));
    setSelected(id);
    await source.unarchiveAfterSend(id);
    inbox.change((rows) => ({
      ...rows,
      archived: rows.archived.filter((x) => x !== id),
    }));
    announceSent(id);
  }
  const threadNote = (c: Conversation, item: Product | undefined) => {
    const threadDealState = rows?.deals?.[c.id];
    const dealNote = threadDealNote(
      threadDealState,
      c.seller_id === userId ? "seller" : "buyer",
      now,
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
  const select = (id: string) => {
    setSelected(id);
    setError("");
  };
  const threadRows = visibleThreads.map((c): ThreadRow => {
    const item = listings.find((l) => l.id === c.listing_id),
      other = c.buyer_id === userId ? c.seller_id : c.buyer_id,
      newest = latest[c.id];
    return {
      id: c.id,
      active: selected === c.id,
      image: item && cardImageFor(item),
      name:
        (item?.demo && names[other]
          ? withoutDemoPrefix(names[other])
          : names[other]) || (c.buyer_id === userId ? "Seller" : "Buyer"),
      title: item?.title ?? "Listing unavailable",
      preview:
        newest && `${newest.sender_id === userId ? "You: " : ""}${newest.body}`,
      note: threadNote(c, item),
      unread:
        rows?.reads != null &&
        isUnread(
          accountInboxThread(c.id, newest, userId, rows.systemLatest[c.id]),
          rows.reads,
        ),
      onSelect: () => {
        select(c.id);
        onThreadOpened?.(c.id);
      },
    };
  });
  const filtering = query !== "" || filter !== "all";
  const shown = selected !== "" && (current !== undefined || !!product);
  const itemId = current?.listing_id ?? product?.id ?? "";
  const dealNote = !otherBlocked && !seededSeller ? deal.error : "";
  return {
    kind: "account",
    state,
    selected,
    draftKey: selected,
    role,
    conversationOpen: selected !== "",
    visible: Boolean(current),
    now,
    notice:
      rows && rows.reads === null
        ? "Pako can't read replies here yet. You can still send messages."
        : undefined,
    archiveView: {
      showing: showArchived,
      onToggle: () => {
        setShowArchived((value) => !value);
        select("");
      },
    },
    search: { query, onQuery: setQuery, filter, onFilter: setFilter },
    rows: threadRows,
    newRow:
      newThreadShown && product
        ? {
            id: `new:${product.id}`,
            active: true,
            image: cardImageFor(product),
            name: otherName,
            title: product.title,
            note: "New conversation",
          }
        : undefined,
    loading: !rows && !inbox.loadError,
    empty:
      rows && !visibleThreads.length && !newThreadShown
        ? filtering || showArchived
          ? {
              note: filtering
                ? "No matches. Try a different search or filter."
                : "No archived conversations.",
            }
          : "inbox"
        : "none",
    loadError: inbox.loadError
      ? { message: inbox.loadError, onRetry: () => void inbox.refresh() }
      : undefined,
    readError: inbox.readError || undefined,
    thread: shown
      ? {
          image: product && cardImageFor(product),
          title: product?.title ?? "Listing unavailable",
          detail:
            product &&
            `${money(product.price)} · ${STATUS_WORDS[product.status]}`,
          onOpenListing: () => onOpenListing(itemId),
          onBack: () => select(""),
          loaded: thread.loaded,
          error: thread.error,
          disclosure: Boolean(current && product),
          actions: {
            archive: current && {
              archived: archived.includes(current.id),
              onToggle: () =>
                void changeArchive(current.id, !archived.includes(current.id)),
            },
            block: otherId
              ? {
                  blocked: otherBlocked,
                  onToggle: () => void toggleBlock(otherId),
                }
              : undefined,
          },
          blocked: otherBlocked,
          dealNote: dealNote || undefined,
          send: {
            listingId: itemId,
            prepare: () => conversationFor(itemId),
            plain: (text) => sendPlain(itemId, text),
            after: () => afterSend(itemId),
          },
        }
      : undefined,
    threadKey: current?.id ?? selected,
    otherName,
    product,
    messages,
    events,
    messageExtras: (message) => (
      <Report client={client} messageId={message.id} />
    ),
    controller,
    dealEnabled: !otherBlocked && !seededSeller,
    nextBuyer: nextBuyer || undefined,
    pako: {
      thread:
        current && product
          ? {
              key: current.id,
              role,
              listing: product,
              messages,
              // Pickup news marks its messages as structured, so Pako waits for it.
              loaded:
                thread.loaded &&
                deal.loaded &&
                (!deal.deal || deal.pickupEventsLoaded),
              deal: threadDealSnapshot(deal.deal, role),
              cache: source.draftCache(current.id),
            }
          : null,
      canNudge: !seededSeller,
      agreedWith:
        agreedElsewhere && (names[agreedElsewhere.buyer_id] || "Buyer"),
    },
    offerTarget:
      product?.id === listingId && role === "buyer" && controller.loaded,
    termsAllowed: !deal.error,
    preparedDrafts: [initialMessage, threadRequest?.draft].filter(
      (draft) => draft !== undefined,
    ),
    openingDraft: initialMessage,
    read: {
      key: current?.id ?? "",
      newsAt: newsFrom(current && rows?.systemLatest[current.id], userId),
      mark: inbox.markRead,
    },
  };
}

/** News nobody in the thread wrote counts as read with the thread; the student's own does not count. */
const newsFrom = (
  news: { sender_id: string | null; created_at: string } | undefined,
  userId: string,
) => (news && news.sender_id !== userId ? news.created_at : undefined);

/** Tells the open thread and the inbox that a message went out. */
const announceSent = (conversationId: string) =>
  window.dispatchEvent(
    new CustomEvent("takeover-message-sent", { detail: conversationId }),
  );
