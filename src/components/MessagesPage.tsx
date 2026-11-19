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
import { useOnline } from "../hooks/useOnline";
import { usePageVisible } from "../hooks/usePageVisible";
import type { ThreadReads } from "../hooks/useThreadReads";
import { demoInboxThread, isUnread } from "../inboxActivity";
import { newestAt } from "../inboxDeals";
import { demoThreadMessage, type ThreadMessage } from "../pakoThread";
import { demoTurnCache } from "../pakoTurnCache";
import InboxEmpty from "./InboxEmpty";
import {
  ChatPartner,
  ChatSegment,
  ChatThreadCard,
  InboxLoading,
  usePakoDrafts,
} from "./ChatParts";
import { useThreadDeal, type ThreadEvent } from "./ThreadDeal";
import { useThreadPako, type PakoReading } from "./ThreadPako";
import {
  CARD_IN_CONVERSATION,
  sendFailure,
  ThreadComposer,
  ThreadDisclosure,
  ThreadLog,
} from "./ThreadView";
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
  /** A message the app prepared for the listing's thread: the opening offer, or a follow-up. */
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
/**
 * A conversation the app asks Messages to open, with a message it prepared
 * there, such as a follow-up; each tap is a new request.
 */
export type ThreadRequest = { id: string; draft?: string };
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
const DEMO_ROLES = [
  ["buyer", "Buyer"],
  ["seller", "Seller"],
] as const;
export default function MessagesPage(props: MessagesPageProps) {
  if (props.mode === "account") return <AccountMessages {...props} />;
  if (props.mode === "signed-out") return <p>Sign in to open your messages.</p>;
  return <DemoMessagesPage {...props} />;
}

/** A local thread from one side: its messages, who wrote them and the newest one. */
const threadMessages = (
  conversation: SellerConversation,
  role: "buyer" | "seller",
): ThreadMessage[] =>
  conversation.messages.map((message) => demoThreadMessage(message, role));

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
      setSelected(
        (value) =>
          value || (conversations[0] ? threadKeyOf(conversations[0]) : ""),
      );
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
  const pakoDrafts = usePakoDrafts();
  const saved = conversations.find((item) => threadKeyOf(item) === selected);
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
  const cardInConversation = useMediaQuery(CARD_IN_CONVERSATION);
  const online = useOnline();
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
    agreedWith: agreedElsewhere && buyerName(agreedElsewhere.buyerKey),
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
    !saved?.buyerKey &&
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
    setError("");
  };
  /** An agreed deal keeps its conversation until it is cancelled. */
  const dealHolds = saved?.deal?.status === "agreed";
  // A message the app prepared, the opening offer or a follow-up, stays labelled as Pako's until the student edits it.
  const appDraft =
    Boolean(initialMessage) &&
    role === "buyer" &&
    selected === listingId &&
    text === initialMessage;
  /** Only the opening offer from the search chat carries terms. */
  const openingTerms = appDraft ? initialTerms : undefined;
  // Terms travel with the text from Pako's option or the opening offer while the deal can take them.
  const attached = assistant.terms ?? openingTerms ?? null;
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
    const fromPako = appDraft || assistant.draftedByPako;
    const celebrates = Boolean(openingTerms) || assistant.celebrates;
    const withTerms = attached && termsNote?.states ? attached : null;
    setBusy(true);
    setSendError("");
    setError("");
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
      setSendError(sendFailure(error));
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
        Demo messages are saved in this browser.
        {developerMode && " The Seller role previews the other side."}
      </p>
      <div className="seller-chat-layout">
        <nav aria-label="Conversations">
          {inbox.error && (
            <p className="inbox-error" role="alert">
              {online
                ? "Couldn't refresh your conversations. Trying again in a moment."
                : "You're offline. Your conversations refresh once you're back."}
            </p>
          )}
          {conversations.map((item, order) => (
            <ChatThreadCard
              key={item.id}
              order={order}
              active={selected === threadKeyOf(item)}
              disabled={busy}
              image={imageFor(item)}
              name={item.buyerKey ? buyerName(item.buyerKey) : item.seller}
              title={item.title}
              preview={item.messages.at(-1)?.text}
              note={threadNote(item)}
              unread={isUnread(demoInboxThread(item), reads.reads)}
              onSelect={() => openThread(threadKeyOf(item))}
            />
          ))}
          {listing &&
            dismissedListing !== listing.id &&
            !conversations.some(
              (item) => threadKeyOf(item) === listing.id,
            ) && (
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
          {!loaded && !inbox.error && <InboxLoading />}
          {loaded &&
            !conversations.length &&
            (!listing || dismissedListing === listing.id) &&
            !inbox.error && <InboxEmpty onBrowse={onBrowse} />}
        </nav>
        <section
          className="seller-chat"
          aria-label={current ? `Conversation with ${otherName}` : "Conversation"}
        >
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
                      aria-disabled={dealHolds || undefined}
                      disabled={busy}
                      onClick={() =>
                        dealHolds
                          ? setError(
                              "Cancel the active deal first. Then you can delete this conversation.",
                            )
                          : void changeDeleted(saved, true)
                      }
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
                {developerMode && (
                  <ChatSegment
                    label="Demo role"
                    options={DEMO_ROLES}
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
              {!cardInConversation && threadDeal.card}
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
                after={
                  <>
                    {cardInConversation && threadDeal.card}
                    <AnimatePresence>{threadDeal.celebration}</AnimatePresence>
                    {!threadDeal.celebrating &&
                      assistant.tray(threadDeal.trayMoment)}
                  </>
                }
              />
              <ThreadComposer
                text={text}
                busy={busy}
                disabled={false}
                sendBlocked={false}
                error={sendError || error}
                pakoDrafted={appDraft || assistant.draftedByPako}
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
      {error && !current && <p role="alert">{error}</p>}
    </section>
  );
}
