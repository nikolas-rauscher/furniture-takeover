import { Button } from "./ui/button";
import type { AccountConnection } from "../cloud/AccountSession";
import AccountMessages from "../cloud/AccountMessages";
import { ArrowLeft, Trash2, X } from "@/components/icons";
import { motionBehavior } from "../uiMotion";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { SellerConversation } from "../../shared/messages";
import {
  listMessages,
  sendMessage,
  setConversationDeleted,
} from "../api/messages";
import { PendingMessage } from "../pendingMessage";
import type { Product } from "../../shared/marketplace";
import InboxEmpty from "./InboxEmpty";
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
} from "./ChatParts";
import "./messages.css";
export type MessagesPageProps = {
  account?: AccountConnection;
  onDeleted?: (id: string) => void;
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
};
const DEMO_VIEWS = [
  ["buyer", "Buyer"],
  ["seller", "Seller"],
] as const;
export default function MessagesPage(props: MessagesPageProps) {
  if (props.account?.session)
    return (
      <AccountMessages
        {...props}
        account={{
          client: props.account.client,
          session: props.account.session,
        }}
      />
    );
  if (props.account) return <p>Sign in to open your messages.</p>;
  return <DemoMessagesPage {...props} />;
}
function DemoMessagesPage({
  listingId,
  listing,
  listings,
  onOpenListing,
  onBrowse,
  initialMessage,
  onBeforeSend,
  onSent,
  onDeleted,
}: MessagesPageProps) {
  const [conversations, setConversations] = useState<SellerConversation[]>([]);
  const [selected, setSelected] = useState(listingId ?? "");
  const [showConversation, setShowConversation] = useState(Boolean(listingId));
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
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
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState<SellerConversation>();
  const [dismissedListing, setDismissedListing] = useState("");
  const revision = useRef(0);
  const imageFor = (item: { listingId: string; image?: string }) =>
    listings.find((product) => product.id === item.listingId)?.image ??
    item.image;
  const changeDeleted = async (item: SellerConversation, remove: boolean) => {
    setBusy(true);
    setError("");
    revision.current++;
    try {
      const updated = await setConversationDeleted(item.id, remove);
      setConversations((items) =>
        remove
          ? items.filter((entry) => entry.id !== item.id)
          : [updated, ...items.filter((entry) => entry.id !== item.id)],
      );
      if (remove) {
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
        setDeleted(undefined);
        setDismissedListing("");
        setSelected(updated.listingId);
      }
      stickToBottom.current = true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update conversation.",
      );
    } finally {
      revision.current++;
      setBusy(false);
    }
  };
  const pendingMessage = useRef(new PendingMessage());
  const pakoDrafts = usePakoDrafts();
  const [celebration, setCelebration] = useSentCelebration();
  const current =
    conversations.find((item) => item.listingId === selected) ??
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
  const messagesRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  useEffect(() => {
    const container = messagesRef.current;
    if (container && stickToBottom.current)
      container.scrollTo({
        top: container.scrollHeight,
        behavior: motionBehavior(),
      });
  }, [selected, current?.messages.length]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      const startedAt = revision.current;
      return listMessages()
        .then((items) => {
          if (active && startedAt === revision.current) {
            setConversations(items);
            setSelected((value) => value || items[0]?.listingId || "");
            setError("");
          }
        })
        .catch((error) => {
          if (active) setError(error.message);
        });
    };
    void refresh();
    const timer = setInterval(refresh, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const openThread = (id: string) => {
    stickToBottom.current = true;
    setSelected(id);
    setShowConversation(true);
    setRole("buyer");
  };
  // A draft Pako prepared stays labelled as his until the visitor edits it.
  const pakoDraft =
    Boolean(initialMessage) &&
    role === "buyer" &&
    selected === listingId &&
    text === initialMessage;
  return (
    <section
      className={`messages-page demo-messages${showConversation && current ? " has-conversation" : ""}`}
      aria-label="Messages page"
    >
      <div className="page-title">
        <h1>Messages</h1>
        <p>Talk to sellers and arrange your pickup.</p>
      </div>
      <p className="quiet-caption">
        Local demo inbox · Seller view previews the other side. Real accounts
        are not connected yet.
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
          {!conversations.length &&
            (!listing || dismissedListing === listing.id) &&
            !error && <InboxEmpty onBrowse={onBrowse} />}
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
                    name={current.seller}
                    image={imageFor(current)}
                    title={current.title}
                    onOpenListing={() => onOpenListing(current.listingId)}
                  />
                  {conversations.some((item) => item.id === current.id) && (
                    <Button
                      className="icon-button chat-delete-button"
                      aria-label="Delete conversation"
                      title="Delete conversation"
                      disabled={busy}
                      onClick={() => void changeDeleted(current, true)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
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
              </header>
              <div
                className="seller-chat-messages"
                ref={messagesRef}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  stickToBottom.current =
                    el.scrollHeight - el.clientHeight - el.scrollTop < 72;
                }}
                role="log"
                aria-live="polite"
              >
                {!current.messages.length && <ChatStart />}
                <AnimatePresence key={current.id} initial={false}>
                  {current.messages.map((message, index) => (
                    <div className="message-entry" key={message.id}>
                      {startsNewDay(
                        message.createdAt,
                        current.messages[index - 1]?.createdAt,
                      ) && <ChatDate createdAt={message.createdAt} />}
                      <ChatMessage
                        mine={message.sender === role}
                        drafted={
                          message.sender === role &&
                          pakoDrafts.drafted(message.id)
                        }
                        author={
                          message.sender === role
                            ? "You"
                            : message.sender === "buyer"
                              ? "Buyer"
                              : current.seller
                        }
                        createdAt={message.createdAt}
                        text={message.text}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {celebration && <SentCelebration recipient={celebration} />}
              </AnimatePresence>
              <form
                className="conversation-composer"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy || !text.trim()) return;
                  const fromPako = pakoDraft;
                  setBusy(true);
                  setError("");
                  try {
                    onBeforeSend?.(current.listingId, role);
                    const messageId = pendingMessage.current.idFor(
                      current.listingId,
                      role,
                      text,
                    );
                    const updated = await sendMessage(
                      {
                        id: current.listingId,
                        title: current.title,
                        seller: current.seller,
                        image: imageFor(current),
                      },
                      text,
                      role,
                      messageId,
                    );
                    onSent?.(current.listingId, role, text.trim());
                    pendingMessage.current.acknowledge(messageId);
                    if (fromPako) {
                      pakoDrafts.remember(messageId);
                      setCelebration(current.seller);
                    }
                    setConversations((items) => [
                      updated,
                      ...items.filter((item) => item.id !== updated.id),
                    ]);
                    stickToBottom.current = true;
                    setText("");
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Could not send message.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {pakoDraft && (
                  <PakoLabel>
                    Pako drafted this for you. Check it, then send.
                  </PakoLabel>
                )}
                <ChatComposerField
                  value={text}
                  disabled={false}
                  busy={busy}
                  onValueChange={setText}
                />
                <div className="seller-message-meta">
                  <small className="composer-keyboard-hint">
                    Ctrl / ⌘ + Enter to send
                  </small>
                </div>
              </form>
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
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
