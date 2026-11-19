import { Button } from "./ui/button";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import AccountMessages from "../cloud/AccountMessages";
import type { AccountInbox } from "../cloud/useAccountInbox";
import { ArrowLeft, Trash2, X } from "@/components/icons";
import { AnimatePresence } from "motion/react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { threadDealSnapshot, type DealTerms } from "../../shared/deal";
import type { SellerConversation } from "../../shared/messages";
import { sendMessage, setConversationDeleted } from "../api/messages";
import { PendingMessage } from "../pendingMessage";
import type { Product } from "../../shared/marketplace";
import { NO_TERMS } from "../dealOptions";
import { attachedTermsNote, threadDealNote } from "../dealWords";
import { useDemoDeal } from "../hooks/useDemoDeal";
import type { DemoInbox } from "../hooks/useDemoInbox";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePageVisible } from "../hooks/usePageVisible";
import type { ThreadReads } from "../hooks/useThreadReads";
import { demoInboxThread, isUnread } from "../inboxActivity";
import { newestAt } from "../inboxDeals";
import type { ThreadMessage } from "../pakoThread";
import { demoTurnCache } from "../pakoTurnCache";
import InboxEmpty from "./InboxEmpty";
import {
  ChatPartner,
  ChatSegment,
  ChatThreadCard,
  usePakoDrafts,
} from "./ChatParts";
import { useThreadDeal, type ThreadEvent } from "./ThreadDeal";
import { useThreadPako, type PakoReading } from "./ThreadPako";
import { ThreadComposer, ThreadDisclosure, ThreadLog } from "./ThreadView";
import "./messages.css";

/** What both inboxes take from the app. */
export type MessagesProps = {
  /** Enables local role previews only; account inboxes always use real identity. */
  developerMode?: boolean;
  onDeleted?: (id: string) => void;
  /** Feature-flagged availability prototype shown above the open thread. */
  threadBanner?: (thread: {
    listingId: string;
    role: "buyer" | "seller";
    onConversation: (conversation: SellerConversation) => void;
  }) => ReactNode;
  listingId?: string;
  listing?: Product;
  listings: Product[];
  onOpenListing: (id: string) => void;
  /** Leads from an empty inbox to the listings, where conversations start. */
  onBrowse: () => void;
  initialMessage?: string;
  /** The terms the opening offer states; they travel with it while its text states them. */
  initialTerms?: DealTerms;
  /** Changes each time the student asks for the offer card from a listing. */
  offerRequest?: number;
  /** The campus meeting point near where the student searches from. */
  homePoint?: string;
  /** Applies a listing status a deal change brought, through the app's one status path. */
  onListingStatus: (
    listingId: string,
    status: "active" | "reserved",
  ) => Promise<void>;
  onBeforeSend?: (listingId: string, role: "buyer" | "seller") => void;
  onSent?: (
    listingId: string,
    role: "buyer" | "seller",
    message: string,
  ) => void;
  pako: PakoReading;
};
/** A conversation the app asks Messages to open; each tap is a new request. */
export type ThreadRequest = { id: string };
/** The inbox the app runs: local, signed in, or waiting for a sign-in. */
export type MessagesInboxProps =
  | { mode: "demo"; inbox: DemoInbox; reads: ThreadReads }
  | {
      mode: "account";
      account: { client: SupabaseClient; session: Session };
      inbox: AccountInbox;
      /** A conversation to open by itself, such as a seller's deal from Home. */
      threadRequest?: ThreadRequest;
    }
  | { mode: "signed-out" };
export type MessagesPageProps = MessagesProps & MessagesInboxProps;
const DEMO_VIEWS = [
  ["buyer", "Buyer"],
  ["seller", "Seller"],
] as const;
export default function MessagesPage(props: MessagesPageProps) {
  if (props.mode === "account") return <AccountMessages {...props} />;
  if (props.mode === "signed-out") return <p>Sign in to open your messages.</p>;
  return <DemoMessagesPage {...props} />;
}

/** A local thread from one side: its messages, who wrote them and the newest one. */
function threadMessages(
  conversation: SellerConversation,
  role: "buyer" | "seller",
): ThreadMessage[] {
  return conversation.messages.map((message) => ({
    id: message.id,
    from: message.sender === role ? "me" : "them",
    text: message.text,
    at: message.createdAt,
    ...(message.deal ? { structured: true } : {}),
  }));
}

/** A local thread's deal changes: each with the message that carried it, and news nobody wrote. */
function threadEvents(conversation: SellerConversation): ThreadEvent[] {
  return [
    ...conversation.messages.flatMap((message) =>
      message.deal
        ? [
            {
              id: `${message.id}:deal`,
              kind: message.deal.kind,
              terms: message.deal.terms,
              messageId: message.id,
              at: message.createdAt,
            },
          ]
        : [],
    ),
    ...(conversation.systemEvents ?? []).map((event, index) => ({
      id: `${conversation.id}:news:${index}`,
      kind: event.kind,
      terms: null,
      messageId: null,
      at: event.at,
    })),
  ];
}

const GONE_NOTES: Record<Exclude<Product["status"], "active">, string> = {
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "No longer listed",
};

function DemoMessagesPage({
  developerMode = false,
  inbox,
  reads,
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
  threadBanner,
}: MessagesProps & { inbox: DemoInbox; reads: ThreadReads }) {
  const { conversations, loaded } = inbox;
  const [selected, setSelected] = useState(listingId ?? "");
  const [showConversation, setShowConversation] = useState(Boolean(listingId));
  const [previewRole, setRole] = useState<"buyer" | "seller">("buyer");
  // Use buyer immediately on disable, including before the effect runs.
  const role = developerMode ? previewRole : "buyer";
  useEffect(() => {
    if (!developerMode) setRole("buyer");
  }, [developerMode]);
  // The newest conversation opens once the inbox has loaded.
  useEffect(() => {
    if (loaded)
      setSelected((value) => value || conversations[0]?.listingId || "");
  }, [loaded, conversations]);
  const [drafts, setDrafts] = useState<Record<string, string>>(
    listingId && initialMessage
      ? { [`${listingId}:buyer`]: initialMessage }
      : {},
  );
  const requestedSelection = useRef({ listingId, initialMessage });
  useEffect(() => {
    const previous = requestedSelection.current;
    if (
      previous.listingId === listingId &&
      previous.initialMessage === initialMessage
    )
      return;
    requestedSelection.current = { listingId, initialMessage };
    if (!listingId) return;
    setSelected(listingId);
    setShowConversation(true);
    if (initialMessage)
      setDrafts((current) => ({
        ...current,
        [`${listingId}:buyer`]: initialMessage,
      }));
  }, [listingId, initialMessage]);
  const draftKey = `${selected}:${role}`;
  const text = drafts[draftKey] ?? "";
  const setText = (value: string) =>
    setDrafts((current) => ({ ...current, [draftKey]: value }));
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState<SellerConversation>();
  const [dismissedListing, setDismissedListing] = useState("");
  const productFor = (id: string) => listings.find((item) => item.id === id);
  const imageFor = (item: { listingId: string; image?: string }) =>
    productFor(item.listingId)?.image ?? item.image;
  const changeDeleted = async (item: SellerConversation, remove: boolean) => {
    setBusy(true);
    setError("");
    try {
      const updated = await setConversationDeleted(item.id, remove);
      if (remove) {
        inbox.remove(item.id);
        onDeleted?.(item.listingId);
        setDeleted(item);
        setDismissedListing(item.listingId);
        setSelected(
          conversations.find((entry) => entry.id !== item.id)?.listingId ?? "",
        );
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
        setSelected(updated.listingId);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update conversation.",
      );
    } finally {
      setBusy(false);
    }
  };
  const pendingMessage = useRef(new PendingMessage());
  const pakoDrafts = usePakoDrafts();
  const saved = conversations.find((item) => item.listingId === selected);
  const current =
    saved ??
    (listing && selected === listing.id
      ? {
          id: `new-${listing.id}`,
          listingId: listing.id,
          title: listing.title,
          image: listing.image,
          seller: listing.seller === "You" ? "Seller" : listing.seller,
          messages: [],
        }
      : undefined);
  const product = current && productFor(current.listingId);
  const otherName = role === "buyer" ? (current?.seller ?? "") : "Buyer";
  const messages = current ? threadMessages(current, role) : [];
  const events = current ? threadEvents(current) : [];
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
  const pageVisible = usePageVisible();
  const visible = Boolean(current) && (!phone || showConversation);
  const assistant = useThreadPako({
    reading,
    thread:
      current && product
        ? {
            key: threadKey,
            role,
            listing: product,
            messages,
            loaded: (loaded || !saved) && deal.loaded,
            deal: threadDealSnapshot(deal.deal, role),
            cache: demoTurnCache(threadKey),
          }
        : null,
    otherName,
    visible,
    text,
    onText: setText,
    canNudge: true,
  });
  const threadDeal = useThreadDeal({
    threadKey,
    controller: deal,
    role,
    otherName,
    listing: product,
    messages,
    events,
    turn: assistant.turn,
    enabled: true,
    visible,
    homePoint,
    onStatusChange: onListingStatus,
    onWrite: setText,
  });
  // A listing's "Draft an offer" opens the offer card in its thread, once per tap.
  const offerOpened = useRef<number>(undefined);
  const offerThread =
    current?.listingId === listingId &&
    role === "buyer" &&
    deal.loaded &&
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
  // Reading a thread covers the other side's newest message and news nobody wrote, such as another buyer's deal.
  const seenUpTo = newestAt([
    [...messages].reverse().find((message) => message.from === "them")?.at,
    saved?.systemEvents?.at(-1)?.at,
  ]);
  const readKey = current && role === "buyer" ? `${current.id}:buyer` : "";
  useEffect(() => {
    if (visible && pageVisible && readKey && seenUpTo)
      reads.markRead(readKey, seenUpTo);
  }, [visible, pageVisible, readKey, seenUpTo, reads.markRead]);
  const openThread = (id: string) => {
    setSelected(id);
    setShowConversation(true);
    setRole("buyer");
  };
  // The opening offer Pako prepared stays labelled as his until the student edits it.
  const offerDraft =
    Boolean(initialMessage) &&
    role === "buyer" &&
    selected === listingId &&
    text === initialMessage;
  // Terms travel with the text from Pako's option or the opening offer while the deal can take them.
  const attached =
    assistant.terms ?? (offerDraft ? (initialTerms ?? null) : null);
  const termsNote =
    attached && threadDeal.open ? attachedTermsNote(text, attached) : null;
  /** A message without terms: the thread's ordinary path. */
  async function sendPlain(thread: SellerConversation) {
    const messageId = pendingMessage.current.idFor(
      thread.listingId,
      role,
      text,
    );
    const updated = await sendMessage(
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
  async function send(thread: SellerConversation) {
    const fromPako = offerDraft || assistant.draftedByPako;
    const celebrates = offerDraft || assistant.celebrates;
    const withTerms = attached && termsNote?.states ? attached : null;
    setBusy(true);
    setSendError("");
    try {
      onBeforeSend?.(thread.listingId, role);
      const messageId = withTerms
        ? await threadDeal.sendTerms(withTerms, text.trim())
        : await sendPlain(thread);
      onSent?.(thread.listingId, role, text.trim());
      if (fromPako) pakoDrafts.remember(messageId);
      if (celebrates && !withTerms)
        threadDeal.celebrate({ kind: "sent", other: otherName });
      assistant.sent();
      setText("");
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Could not send message. Your text is kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  const threadNote = (item: SellerConversation) => {
    const dealNote = threadDealNote(item.deal, "buyer");
    if (item.deal?.status === "agreed") return dealNote;
    const status = productFor(item.listingId)?.status;
    if (status && status !== "active") return GONE_NOTES[status];
    return (
      dealNote ??
      (item.messages.at(-1)?.sender === "seller" ? "Your turn" : undefined)
    );
  };
  return (
    <section
      className={`messages-page demo-messages${showConversation && current ? " has-conversation" : ""}`}
      aria-label="Messages page"
    >
      <div className="page-title">
        <h1>Messages</h1>
        <p>
          Chat with buyers and sellers. Pako reads replies and drafts your
          answers.
        </p>
      </div>
      <p className="quiet-caption">
        Local workspace inbox · Conversations are linked to this browser.
        {developerMode && " Seller view previews the other side."}
      </p>
      <div className="seller-chat-layout">
        <nav aria-label="Conversations">
          {conversations.map((item, order) => (
            <ChatThreadCard
              key={item.id}
              order={order}
              active={selected === item.listingId}
              disabled={busy}
              image={imageFor(item)}
              name={item.seller}
              title={item.title}
              preview={item.messages.at(-1)?.text}
              note={threadNote(item)}
              unread={isUnread(demoInboxThread(item), reads.reads)}
              onSelect={() => openThread(item.listingId)}
            />
          ))}
          {listing &&
            dismissedListing !== listing.id &&
            !conversations.some((item) => item.listingId === listing.id) && (
              <ChatThreadCard
                order={conversations.length}
                active
                disabled={busy}
                image={listing.image}
                name={listing.seller === "You" ? "Seller" : listing.seller}
                title={listing.title}
                note="New conversation"
                onSelect={() => openThread(listing.id)}
              />
            )}
          {loaded &&
            !conversations.length &&
            (!listing || dismissedListing === listing.id) &&
            !inbox.error && <InboxEmpty onBrowse={onBrowse} />}
        </nav>
        <section className="seller-chat" aria-label="Seller conversation">
          {current ? (
            <>
              <header>
                <div className="chat-header-item">
                  <Button
                    type="button"
                    className="icon-button inbox-back"
                    aria-label="Back to conversations"
                    onClick={() => setShowConversation(false)}
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  <ChatPartner
                    name={otherName}
                    image={imageFor(current)}
                    title={current.title}
                    onOpenListing={() => onOpenListing(current.listingId)}
                  />
                  {saved && (
                    <Button
                      className="icon-button chat-delete-button"
                      aria-label="Delete conversation"
                      title={
                        saved.deal?.status === "agreed"
                          ? "Cancel the deal before deleting this conversation"
                          : "Delete conversation"
                      }
                      disabled={busy || saved.deal?.status === "agreed"}
                      onClick={() => void changeDeleted(saved, true)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
                {developerMode && (
                  <ChatSegment
                    label="Demo view"
                    options={DEMO_VIEWS}
                    value={role}
                    disabled={busy}
                    onChange={setRole}
                  />
                )}
              </header>
              {threadBanner?.({
                listingId: current.listingId,
                role,
                onConversation: inbox.put,
              })}
              {threadDeal.card}
              <ThreadLog
                threadKey={threadKey}
                messages={messages}
                otherName={otherName}
                loaded={loaded || !saved}
                drafted={pakoDrafts.drafted}
                events={events}
                disclosure={
                  product &&
                  reading.available === "ready" && (
                    <ThreadDisclosure
                      autoRead={reading.autoRead}
                      onOpenSettings={reading.onOpenSettings}
                    />
                  )
                }
              />
              <AnimatePresence>{threadDeal.celebration}</AnimatePresence>
              {!threadDeal.celebrating && assistant.tray(threadDeal.trayMoment)}
              <ThreadComposer
                text={text}
                busy={busy}
                disabled={false}
                sendBlocked={false}
                error={sendError}
                pakoDrafted={offerDraft || assistant.draftedByPako}
                tools={assistant.askMenu}
                terms={termsNote}
                onTextChange={setText}
                onSend={() => void send(current)}
              />
              {threadDeal.editor}
            </>
          ) : (
            <p className="chat-select-note">Select a conversation.</p>
          )}
        </section>
      </div>
      {deleted && (
        <div className="chat-delete-notice" role="status">
          <span>Conversation deleted.</span>
          <Button
            className="chat-listing-link"
            disabled={busy}
            onClick={() => void changeDeleted(deleted, false)}
          >
            Undo
          </Button>
          <Button
            className="icon-button"
            aria-label="Dismiss deletion notice"
            onClick={() => setDeleted(undefined)}
          >
            <X size={16} />
          </Button>
        </div>
      )}
      {(error || inbox.error) && <p role="alert">{error || inbox.error}</p>}
    </section>
  );
}
