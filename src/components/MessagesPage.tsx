import { Image as ImageIcon, Trash2 } from "lucide-react";
import { motionBehavior } from "../uiMotion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SellerConversation } from "../../shared/messages";
import {
  listMessages,
  sendMessage,
  setConversationDeleted,
} from "../api/messages";
import { PendingMessage } from "../pendingMessage";
import type { Product } from "../../shared/marketplace";
import "./messages.css";
export default function MessagesPage({
  listingId,
  listing,
  listings,
  onOpenListing,
  initialMessage,
  onBeforeSend,
  onSent,
  onDeleted,
  threadBanner,
}: {
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
  initialMessage?: string;
  onBeforeSend?: (listingId: string, role: "buyer" | "seller") => void;
  onSent?: (
    listingId: string,
    role: "buyer" | "seller",
    message: string,
  ) => void;
}) {
  const [conversations, setConversations] = useState<SellerConversation[]>([]);
  const [selected, setSelected] = useState(listingId ?? "");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [drafts, setDrafts] = useState<Record<string, string>>(
    listingId && initialMessage
      ? { [`${listingId}:buyer`]: initialMessage }
      : {},
  );
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
  const thumbnail = (item: {
    listingId: string;
    title: string;
    image?: string;
  }) => {
    const image = imageFor(item);
    return image ? (
      <img className="chat-item-thumbnail" src={image} alt={item.title} />
    ) : (
      <span
        className="chat-item-thumbnail chat-item-placeholder"
        aria-hidden="true"
      >
        <ImageIcon size={22} />
      </span>
    );
  };
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
  return (
    <section className="messages-page" aria-label="Messages page">
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
          {conversations.map((item) => (
            <button
              className={
                selected === item.listingId
                  ? "chat-thread active"
                  : "chat-thread"
              }
              key={item.id}
              disabled={busy}
              onClick={() => {
                stickToBottom.current = true;
                setSelected(item.listingId);
                setRole("buyer");
              }}
            >
              {thumbnail(item)}
              <span className="chat-thread-copy">
                <strong>{item.seller}</strong>
                <span>{item.title}</span>
              </span>
            </button>
          ))}
          {listing &&
            dismissedListing !== listing.id &&
            !conversations.some((item) => item.listingId === listing.id) && (
              <button
                className="chat-thread active"
                disabled={busy}
                onClick={() => {
                  setSelected(listing.id);
                  setRole("buyer");
                }}
              >
                {thumbnail({ ...listing, listingId: listing.id })}
                <span className="chat-thread-copy">
                  <strong>
                    {listing.seller === "You" ? "Seller" : listing.seller}
                  </strong>
                  <span>{listing.title}</span>
                  <small>New conversation</small>
                </span>
              </button>
            )}
          {!conversations.length &&
            (!listing || dismissedListing === listing.id) &&
            !error && (
              <p>
                No conversations yet. Open a listing and choose Message seller.
              </p>
            )}
        </nav>
        <section className="seller-chat" aria-label="Seller conversation">
          {current ? (
            <>
              <header>
                <div className="chat-header-item">
                  {thumbnail(current)}
                  <div className="chat-header-copy">
                    <strong>{current.seller}</strong>
                    <button
                      className="chat-listing-link"
                      onClick={() => onOpenListing(current.listingId)}
                    >
                      {current.title} ↗
                    </button>
                  </div>
                  {conversations.some((item) => item.id === current.id) && (
                    <button
                      className="chat-delete-button"
                      aria-label="Delete conversation"
                      title="Delete conversation"
                      disabled={busy}
                      onClick={() => void changeDeleted(current, true)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <label>
                  Demo view{" "}
                  <select
                    value={role}
                    disabled={busy}
                    onChange={(event) =>
                      setRole(event.target.value as "buyer" | "seller")
                    }
                  >
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                  </select>
                </label>
              </header>
              {threadBanner?.({
                listingId: current.listingId,
                role,
                onConversation: (updated) => {
                  stickToBottom.current = true;
                  setConversations((items) => [
                    updated,
                    ...items.filter((item) => item.id !== updated.id),
                  ]);
                },
              })}
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
                {!current.messages.length && (
                  <p className="chat-start-note">
                    Ask about this item or propose a pickup time. Your message
                    will appear here once sent.
                  </p>
                )}
                {current.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.sender === role
                        ? "chat-bubble mine"
                        : "chat-bubble"
                    }
                  >
                    <small>
                      {message.sender === "buyer" ? "Buyer" : current.seller}
                    </small>
                    <p>{message.text}</p>
                    <time>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))}
              </div>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy || !text.trim()) return;
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
                <textarea
                  aria-label="Message"
                  placeholder="Write a message…"
                  maxLength={4000}
                  rows={3}
                  value={text}
                  disabled={busy}
                  onChange={(event) => setText(event.target.value)}
                />
                <button
                  className="button primary"
                  disabled={busy || !text.trim()}
                >
                  {busy ? "Sending…" : "Send message"}
                </button>
              </form>
            </>
          ) : (
            <p>Select a conversation.</p>
          )}
        </section>
      </div>
      {deleted && (
        <div className="chat-delete-notice" role="status">
          <span>Conversation deleted.</span>
          <button
            className="chat-listing-link"
            disabled={busy}
            onClick={() => void changeDeleted(deleted, false)}
          >
            Undo
          </button>
          <button
            className="chat-listing-link"
            aria-label="Dismiss deletion notice"
            onClick={() => setDeleted(undefined)}
          >
            ×
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
