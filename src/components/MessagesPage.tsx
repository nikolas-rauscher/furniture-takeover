import { Button } from "./ui/button";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import AccountMessages from "../cloud/AccountMessages";
import type { AccountInbox } from "../cloud/useAccountInbox";
import { ArrowLeft, Trash2, X } from "@/components/icons";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SellerConversation } from "../../shared/messages";
import { sendMessage, setConversationDeleted } from "../api/messages";
import { PendingMessage } from "../pendingMessage";
import type { Product } from "../../shared/marketplace";
import type { DemoInbox } from "../hooks/useDemoInbox";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePageVisible } from "../hooks/usePageVisible";
import type { ThreadReads } from "../hooks/useThreadReads";
import { demoInboxThread, isUnread } from "../inboxActivity";
import type { ThreadMessage } from "../pakoThread";
import { demoTurnCache } from "../pakoTurnCache";
import InboxEmpty from "./InboxEmpty";
import {
  ChatPartner,
  ChatSegment,
  ChatThreadCard,
  SentCelebration,
  usePakoDrafts,
  useSentCelebration,
} from "./ChatParts";
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
  onBeforeSend?: (listingId: string, role: "buyer" | "seller") => void;
  onSent?: (
    listingId: string,
    role: "buyer" | "seller",
    message: string,
  ) => void;
  pako: PakoReading;
};
/** The inbox the app runs: local, signed in, or waiting for a sign-in. */
export type MessagesInboxProps =
  | { mode: "demo"; inbox: DemoInbox; reads: ThreadReads }
  | {
      mode: "account";
      account: { client: SupabaseClient; session: Session };
      inbox: AccountInbox;
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
  }));
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
  const [celebration, setCelebration] = useSentCelebration();
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
  const threadKey = current ? `${current.id}:${role}` : "";
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
            loaded: loaded || !saved,
            cache: demoTurnCache(threadKey),
          }
        : null,
    otherName,
    visible,
    text,
    onText: setText,
    canNudge: true,
  });
  const latestTheirs = [...messages]
    .reverse()
    .find((message) => message.from === "them");
  const readKey = current && role === "buyer" ? `${current.id}:buyer` : "";
  useEffect(() => {
    if (visible && pageVisible && readKey && latestTheirs)
      reads.markRead(readKey, latestTheirs.at);
  }, [visible, pageVisible, readKey, latestTheirs?.at, reads.markRead]);
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
  async function send(thread: SellerConversation) {
    const fromPako = offerDraft || assistant.draftedByPako;
    const celebrates = offerDraft || assistant.celebrates;
    setBusy(true);
    setSendError("");
    try {
      onBeforeSend?.(thread.listingId, role);
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
      onSent?.(thread.listingId, role, text.trim());
      pendingMessage.current.acknowledge(messageId);
      if (fromPako) pakoDrafts.remember(messageId);
      if (celebrates) setCelebration(otherName);
      inbox.put(updated);
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
    const status = productFor(item.listingId)?.status;
    if (status && status !== "active") return GONE_NOTES[status];
    return item.messages.at(-1)?.sender === "seller" ? "Your turn" : undefined;
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
                      title="Delete conversation"
                      disabled={busy}
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
                    onChange={(view) => {
                      setRole(view);
                      setCelebration(null);
                    }}
                  />
                )}
              </header>
              {threadBanner?.({
                listingId: current.listingId,
                role,
                onConversation: inbox.put,
              })}
              <ThreadLog
                threadKey={threadKey}
                messages={messages}
                otherName={otherName}
                loaded={loaded || !saved}
                drafted={pakoDrafts.drafted}
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
              <AnimatePresence>
                {celebration && <SentCelebration recipient={celebration} />}
              </AnimatePresence>
              {assistant.tray}
              <ThreadComposer
                text={text}
                busy={busy}
                disabled={false}
                error={sendError}
                pakoDrafted={offerDraft || assistant.draftedByPako}
                tools={assistant.askMenu}
                onTextChange={setText}
                onSend={() => void send(current)}
              />
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
