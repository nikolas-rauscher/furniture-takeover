import { useEffect, useRef, useState } from "react";
import { nextPickupBuyer, threadDealSnapshot } from "../../shared/deal";
import { availableAgainMessage } from "../../shared/dealMessages";
import { cardImageFor } from "../../shared/listingPhotos";
import type { Product } from "../../shared/marketplace";
import type { SellerConversation } from "../../shared/messages";
import type { InboxView } from "../api/inbox";
import { threadDealNote } from "../dealWords";
import { useDemoDeal } from "../hooks/useDemoDeal";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useNow } from "../hooks/useNow";
import { useOnline } from "../hooks/useOnline";
import { demoInboxThread, isUnread } from "../inboxActivity";
import { demoThreadMessage, type ThreadMessage } from "../pakoThread";
import { PendingMessage } from "../pendingMessage";
import type { MessagesProps } from "./messagesProps";
import {
  useMessagesState,
  type MessagesModel,
  type ThreadRow,
} from "./messagesModel";
import type { ThreadEvent } from "./ThreadDeal";

type DemoMessagesProps = MessagesProps & Extract<InboxView, { mode: "demo" }>;
type Role = "buyer" | "seller";

/** A local thread from one side: its messages, who wrote them and the newest one. */
const threadMessages = (
  conversation: SellerConversation,
  role: Role,
): ThreadMessage[] =>
  conversation.messages.map((message) => demoThreadMessage(message, role));

/** A local thread's deal changes: each with the message that carried it, and news nobody wrote. */
function threadEvents(conversation: SellerConversation): ThreadEvent[] {
  return [
    ...conversation.messages.flatMap((message): ThreadEvent[] => {
      const carried = { messageId: message.id, at: message.createdAt };
      if (message.deal)
        return [
          {
            id: `${message.id}:deal`,
            kind: message.deal.kind,
            terms: message.deal.terms,
            ...carried,
          },
        ];
      if (message.pickupEvent)
        return [
          {
            id: `${message.id}:pickup`,
            ...message.pickupEvent,
            actor: message.sender,
            ...carried,
          },
        ];
      return [];
    }),
    ...(conversation.systemEvents ?? []).map((event, index) => ({
      id: `${conversation.id}:news:${index}`,
      kind: event.kind,
      terms: null,
      messageId: null,
      at: event.at,
    })),
  ];
}

/**
 * Which thread is open: the student's own conversation about a listing goes by
 * the listing, another demo buyer's by the listing and that buyer.
 */
const threadKeyOf = (conversation: SellerConversation) =>
  conversation.buyerKey
    ? `${conversation.listingId}#${conversation.buyerKey}`
    : conversation.listingId;

/** The buyer of a local thread as its seller sees them: the student, or another demo buyer. */
const buyerName = (buyerKey: string | undefined) =>
  buyerKey ? "Another buyer" : "Buyer";

/** The seller of a listing as its buyer sees them; the student's own listing has no name to show. */
const sellerName = (listing: Product) =>
  listing.seller === "You" ? "Seller" : listing.seller;

const GONE_NOTES: Record<Exclude<Product["status"], "active">, string> = {
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "No longer listed",
};

/** A conversation the student is about to start from a listing. */
const newConversation = (listing: Product): SellerConversation => ({
  id: `new-${listing.id}`,
  listingId: listing.id,
  title: listing.title,
  image: cardImageFor(listing),
  seller: sellerName(listing),
  messages: [],
});

/** The local demo's inbox: browser conversations, a developer's role preview and clock, and Delete with Undo. */
export function useDemoMessages(app: DemoMessagesProps): MessagesModel {
  const {
    developerMode = false,
    inbox,
    reads,
    source,
    listingId,
    listing,
    listings,
    initialMessage,
    threadBanner,
  } = app;
  const { conversations, loaded } = inbox;
  const state = useMessagesState(
    listingId && initialMessage
      ? { [`${listingId}:buyer`]: initialMessage }
      : {},
  );
  const { setDrafts, setBusy, setError } = state;
  const [selected, setSelected] = useState(listingId ?? "");
  const [showConversation, setShowConversation] = useState(Boolean(listingId));
  const [previewRole, setRole] = useState<Role>("buyer");
  // Use buyer immediately on disable, including before the effect runs.
  const role = developerMode ? previewRole : "buyer";
  useEffect(() => {
    if (!developerMode) setRole("buyer");
  }, [developerMode]);
  // The newest conversation opens once the inbox has loaded.
  useEffect(() => {
    if (loaded)
      setSelected(
        (value) =>
          value || (conversations[0] ? threadKeyOf(conversations[0]) : ""),
      );
  }, [loaded, conversations]);
  const requestedSelection = useRef({ listingId, initialMessage });
  useEffect(() => {
    const previous = requestedSelection.current;
    if (
      previous.listingId === listingId &&
      previous.initialMessage === initialMessage
    )
      return;
    requestedSelection.current = { listingId, initialMessage };
    if (!listingId) {
      setShowConversation(false);
      return;
    }
    setSelected(listingId);
    setShowConversation(true);
    if (initialMessage)
      setDrafts((current) => ({
        ...current,
        [`${listingId}:buyer`]: initialMessage,
      }));
  }, [listingId, initialMessage, setDrafts]);
  const [deleted, setDeleted] = useState<SellerConversation>();
  const [dismissedListing, setDismissedListing] = useState("");
  const productFor = (id: string) => listings.find((item) => item.id === id);
  const imageFor = (item: { listingId: string; image?: string }) => {
    const product = productFor(item.listingId);
    return product ? cardImageFor(product) : item.image;
  };
  const changeDeleted = async (item: SellerConversation, remove: boolean) => {
    setBusy(true);
    setError("");
    try {
      const updated = await source.archive(item.id, remove);
      if (remove) {
        inbox.remove(item.id);
        app.onDeleted?.(item.listingId);
        setDeleted(item);
        setDismissedListing(item.listingId);
        const next = conversations.find((entry) => entry.id !== item.id);
        setSelected(next ? threadKeyOf(next) : "");
        setDrafts((items) =>
          Object.fromEntries(
            Object.entries(items).filter(
              ([key]) => !key.startsWith(item.listingId + ":"),
            ),
          ),
        );
      } else {
        inbox.put(updated);
        setDeleted(undefined);
        setDismissedListing("");
        setSelected(threadKeyOf(updated));
      }
    } catch {
      setError(
        remove
          ? "Couldn't delete this conversation. Try again."
          : "Couldn't restore this conversation. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const pendingMessage = useRef(new PendingMessage());
  const saved = conversations.find((item) => threadKeyOf(item) === selected);
  const current =
    saved ??
    (listing && selected === listing.id ? newConversation(listing) : undefined);
  const product = current && productFor(current.listingId);
  const otherName =
    role === "buyer" ? (current?.seller ?? "") : buyerName(saved?.buyerKey);
  /** Another thread about the same listing in which the seller already agreed. */
  const agreedElsewhere =
    role === "seller" && current
      ? conversations.find(
          (item) =>
            item.listingId === current.listingId &&
            item.id !== current.id &&
            item.deal?.status === "agreed",
        )
      : undefined;
  const messages = current ? threadMessages(current, role) : [];
  const threadKey = current ? `${current.id}:${role}` : "";
  const deal = useDemoDeal(
    inbox,
    current && product
      ? {
          id: product.id,
          title: current.title,
          seller: current.seller,
          status: product.status,
          image: imageFor(current),
          buyerKey: saved?.buyerKey,
        }
      : undefined,
    role,
  );
  const phone = useMediaQuery("(max-width: 760px)");
  const online = useOnline();
  const now = useNow(true);
  const visible = Boolean(current) && (!phone || showConversation);
  /** After a released pickup, the next buyer in the inbox who wrote about the listing. */
  const released =
    role === "seller" && product?.status === "active" ? saved : undefined;
  const nextThread =
    released?.deal &&
    nextPickupBuyer(
      released.deal,
      conversations.filter((item) => item.messages.length > 0),
    );
  const nextBuyer = released &&
    nextThread && {
      name: buyerName(nextThread.buyerKey),
      onOffer: () => {
        const key = threadKeyOf(nextThread);
        state.offerAgainIn(`${key}:seller`, {
          threadKey: key,
          releasedConversationId: released.id,
          draft: availableAgainMessage(nextThread.title),
        });
        setSelected(key);
        setShowConversation(true);
      },
    };
  /** The thread's booked pickup, which the developer's demo clock jumps around. */
  const bookedPickup =
    deal.deal?.status === "agreed" ? deal.deal.agreed?.terms.pickupAt : null;
  const openThread = (key: string) => {
    setSelected(key);
    setShowConversation(true);
    setRole("buyer");
    setError("");
  };
  /** An agreed deal keeps its conversation until it is cancelled. */
  const dealHolds = saved?.deal?.status === "agreed";
  const prepared =
    initialMessage && role === "buyer" && selected === listingId
      ? initialMessage
      : undefined;
  /** A message without terms: the thread's ordinary path. */
  async function sendPlain(thread: SellerConversation, text: string) {
    const messageId = pendingMessage.current.idFor(
      thread.listingId,
      role,
      text,
    );
    const updated = await source.send(
      {
        id: thread.listingId,
        title: thread.title,
        seller: thread.seller,
        image: imageFor(thread),
      },
      text,
      role,
      messageId,
    );
    pendingMessage.current.acknowledge(messageId);
    inbox.put(updated);
    return messageId;
  }
  const threadNote = (item: SellerConversation) => {
    const dealNote = threadDealNote(item.deal, "buyer", now);
    if (item.deal?.status === "agreed") return dealNote;
    const status = productFor(item.listingId)?.status;
    if (status && status !== "active") return GONE_NOTES[status];
    return (
      dealNote ??
      (item.messages.at(-1)?.sender === "seller" ? "Your turn" : undefined)
    );
  };
  const rows = conversations.map((item): ThreadRow => ({
    id: item.id,
    active: selected === threadKeyOf(item),
    image: imageFor(item),
    name: item.buyerKey ? buyerName(item.buyerKey) : item.seller,
    title: item.title,
    preview: item.messages.at(-1)?.text,
    note: threadNote(item),
    unread: isUnread(demoInboxThread(item), reads.reads),
    onSelect: () => {
      openThread(threadKeyOf(item));
      app.onThreadOpened?.(threadKeyOf(item));
    },
  }));
  const listingShown = listing !== undefined && dismissedListing !== listing.id;
  const newRow: ThreadRow | undefined =
    listingShown &&
    !conversations.some((item) => threadKeyOf(item) === listing.id)
      ? {
          id: `new-${listing.id}`,
          active: true,
          image: cardImageFor(listing),
          name: sellerName(listing),
          title: listing.title,
          note: "New conversation",
          onSelect: () => openThread(listing.id),
        }
      : undefined;
  return {
    kind: "demo",
    state,
    selected,
    draftKey: `${selected}:${role}`,
    role,
    conversationOpen: showConversation && Boolean(current),
    visible,
    now,
    caption: `Demo messages are saved in this browser.${developerMode ? " The Seller role previews the other side." : ""}`,
    refreshError: inbox.error
      ? online
        ? "Couldn't refresh your conversations. Trying again in a moment."
        : "You're offline. Your conversations refresh once you're back."
      : undefined,
    rows,
    newRow,
    loading: !loaded && !inbox.error,
    empty:
      loaded && !conversations.length && !listingShown && !inbox.error
        ? "inbox"
        : "none",
    undo: deleted && {
      onUndo: () => void changeDeleted(deleted, false),
      onDismiss: () => setDeleted(undefined),
    },
    rolePreview: developerMode ? setRole : undefined,
    pickupClock: (developerMode && bookedPickup) || undefined,
    thread: current && {
      image: imageFor(current),
      title: current.title,
      onOpenListing: () => app.onOpenListing(current.listingId),
      onBack: () => {
        setShowConversation(false);
        app.onThreadClosed?.();
      },
      loaded: loaded || !saved,
      disclosure: Boolean(product),
      actions: {
        delete: saved && {
          held: dealHolds,
          onDelete: () =>
            dealHolds
              ? setError(
                  "Cancel the active deal first. Then you can delete this conversation.",
                )
              : void changeDeleted(saved, true),
        },
      },
      blocked: false,
      banner: threadBanner?.({
        listingId: current.listingId,
        role,
        onConversation: inbox.put,
      }),
      send: {
        listingId: current.listingId,
        plain: (text) => sendPlain(current, text),
      },
    },
    threadKey,
    otherName,
    product,
    messages,
    events: current ? threadEvents(current) : [],
    controller: deal,
    dealEnabled: true,
    nextBuyer: nextBuyer || undefined,
    pako: {
      thread:
        current && product
          ? {
              key: threadKey,
              role,
              listing: product,
              messages,
              loaded: (loaded || !saved) && deal.loaded,
              deal: threadDealSnapshot(deal.deal, role),
              cache: source.draftCache(threadKey),
            }
          : null,
      canNudge: true,
      agreedWith: agreedElsewhere && buyerName(agreedElsewhere.buyerKey),
    },
    offerTarget:
      current?.listingId === listingId &&
      !saved?.buyerKey &&
      role === "buyer" &&
      deal.loaded,
    termsAllowed: true,
    preparedDrafts: prepared ? [prepared] : [],
    openingDraft: prepared,
    read: {
      key: current && role === "buyer" ? `${current.id}:buyer` : "",
      newsAt: saved?.systemEvents?.at(-1)?.at,
      mark: reads.markRead,
    },
  };
}
