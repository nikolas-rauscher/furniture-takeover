import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Product } from "../../shared/marketplace";
import type { SellerConversation } from "../../shared/messages";
import {
  listMessages,
  sendMessage,
  setConversationDeleted,
} from "../api/messages";
import {
  HOLD_HOURS,
  SELLER_REPLY_HOURS,
  WAITLIST_PRIORITY_HOURS,
} from "./config";
import { resolveAvailabilityFlag } from "./flag";
import {
  formatDeadline,
  formatTimeLeft,
  reservationRequestMessage,
} from "./format";
import {
  advance,
  cancelReservation,
  confirmReservation,
  declineReservation,
  dismissNotice,
  emptyAvailability,
  joinWaitlist,
  leaveWaitlist,
  listingAvailability,
  releaseOtherReservations,
  rememberThread,
  requestReservation,
  resetAvailability,
  skipHours,
  type AvailabilityNotice,
  type AvailabilityState,
  type StatusChange,
  type Transition,
} from "./reservations";
import { createAvailabilityRepository } from "./storage";
import DetailPanel from "./DetailPanel";
import Notices from "./Notices";
import ThreadBanner, { type ThreadContext } from "./ThreadBanner";
import DemoControls from "./DemoControls";
import { CancelModal, RequestModal } from "./ReservationModals";
import "./availability.css";

type Options = {
  listings: Product[];
  ready: boolean;
  setStatus(id: string, status: Product["status"]): void;
  setToast(message: string): void;
  onFindSimilar(title: string): void;
};
type Dialog = { kind: "request" | "cancel"; listingId: string } | null;

const unavailableStorage = {
  getItem: () => null,
  setItem: () => {
    throw new Error("Browser storage is unavailable.");
  },
  removeItem: () => undefined,
};
function browserStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  try {
    return window.localStorage;
  } catch {
    return unavailableStorage;
  }
}

/** The server accepts only uploaded or bundled photos on messages. */
const messageImage = (image: string) =>
  /^(?:data:image\/(?:jpeg|png|webp);base64,|\/images\/)/.test(image) &&
  image.length <= 750000
    ? image
    : undefined;
const thread = (listing: Product) => ({
  id: listing.id,
  title: listing.title,
  seller: listing.seller === "You" ? "Seller" : listing.seller,
  image: messageImage(listing.image),
});

const noticeText: Record<AvailabilityNotice["kind"], string> = {
  declined: "The seller says it's no longer available.",
  expired: `The seller didn't confirm within ${SELLER_REPLY_HOURS}h, so the listing was removed.`,
  hold_ended: `Your ${HOLD_HOURS}h hold ended without pickup, so the item is available again.`,
  available_again: `It's available again. You're first in line for ${WAITLIST_PRIORITY_HOURS} hours.`,
};

/**
 * Reserve & confirm prototype, active only behind `?availability=reserve`.
 * Returns null when the flag is off so callers render exactly what main does.
 */
export function useAvailability(options: Options) {
  const [flag] = useState(() =>
    resolveAvailabilityFlag(window.location.search, browserStorage()),
  );
  const [repository] = useState(() =>
    createAvailabilityRepository(browserStorage()),
  );
  const [state, setState] = useState<AvailabilityState>(() => {
    if (!flag.enabled) return emptyAvailability();
    try {
      return repository.load().state;
    } catch {
      return emptyAvailability();
    }
  });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const cleaned = useRef(false);

  const clock = (value = stateRef.current) =>
    new Date(Date.now() + value.clockOffsetMs);
  const listing = (id: string) =>
    optionsRef.current.listings.find((item) => item.id === id);

  function commit(next: AvailabilityState, changes: StatusChange[] = []) {
    stateRef.current = next;
    setState(next);
    try {
      repository.save(next);
    } catch {
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent("storage-failure")),
      );
    }
    for (const change of changes)
      optionsRef.current.setStatus(change.listingId, change.status);
  }
  function toastFor(t: Transition, fallback?: string) {
    const notice =
      t.notices.find((item) => item.kind === "available_again") ??
      t.notices.at(-1);
    const message = notice ? noticeText[notice.kind] : fallback;
    if (message) optionsRef.current.setToast(message);
  }

  /** Applies every deadline reached on the simulated clock. */
  function sweep(base = stateRef.current, fallback?: string) {
    const t = advance(base, optionsRef.current.listings, clock(base));
    if (t.state !== stateRef.current || t.statusChanges.length)
      commit(t.state, t.statusChanges);
    toastFor(t, fallback);
  }

  /** Sends a thread message first; the change is kept only if it was delivered. */
  async function withMessage(
    listingId: string,
    sender: "buyer" | "seller",
    text: (t: Transition) => string,
    transition: (now: Date) => Transition,
    done: string,
    onConversation?: (conversation: SellerConversation) => void,
  ) {
    const item = listing(listingId);
    const before = stateRef.current;
    const t = transition(clock());
    if (!item || t.state === before) return;
    setBusy(true);
    try {
      const conversation = await sendMessage(thread(item), text(t), sender);
      onConversation?.(conversation);
      if (stateRef.current !== before)
        throw new Error("This reservation changed meanwhile. Try again.");
      const next =
        sender === "buyer" && conversation.messages.length === 1
          ? rememberThread(t.state, listingId)
          : t.state;
      commit(next, t.statusChanges);
      optionsRef.current.setToast(done);
    } finally {
      setBusy(false);
    }
  }
  const failed = (error: unknown) =>
    optionsRef.current.setToast(
      error instanceof Error
        ? error.message
        : "Could not send the message. Nothing was changed.",
    );

  async function reset(source: AvailabilityState, forget: boolean) {
    const t = resetAvailability(source, optionsRef.current.listings);
    setDialog(null);
    commit(t.state, t.statusChanges);
    if (forget)
      try {
        repository.clear();
      } catch {
        /* nothing stored to clear */
      }
    if (!forget)
      optionsRef.current.setToast(
        "Demo reset. Listing statuses restored; reservations, waitlist and demo messages cleared.",
      );
    else if (t.statusChanges.length || source.threads.length)
      optionsRef.current.setToast(
        "Reserve & confirm is off. Demo listings were restored.",
      );
    if (!source.threads.length) return;
    try {
      const conversations = await listMessages();
      for (const conversation of conversations)
        if (source.threads.includes(conversation.listingId))
          await setConversationDeleted(conversation.id, true);
    } catch {
      optionsRef.current.setToast(
        "Demo listings were restored, but some demo messages could not be deleted.",
      );
    }
  }

  const { ready, listings } = options;
  useEffect(() => {
    if (flag.enabled && ready) sweep();
    // Deadlines depend only on the clock and listing statuses.
  }, [flag.enabled, ready, listings]);
  useEffect(() => {
    // `?availability=off` undoes this prototype's listing changes once.
    if (!flag.cleanup || !ready || cleaned.current) return;
    cleaned.current = true;
    try {
      const restored = repository.load();
      if (restored.source === "stored") void reset(restored.state, true);
    } catch {
      /* storage unavailable: nothing to restore */
    }
  }, [flag.cleanup, ready]);

  if (!flag.enabled) return null;
  const now = clock(state);
  const viewOf = (item: Product) => listingAvailability(state, item, now);
  const dialogListing = dialog && listing(dialog.listingId);

  const actions = {
    request: (item: Product, pickupBy: string) =>
      withMessage(
        item.id,
        "buyer",
        () => reservationRequestMessage(pickupBy),
        (at) => requestReservation(stateRef.current, item, pickupBy, at),
        `Reservation requested. The seller has ${SELLER_REPLY_HOURS}h to confirm.`,
      ).then(() => setDialog(null)),
    cancel: (item: Product) =>
      withMessage(
        item.id,
        "buyer",
        () =>
          item.status === "reserved"
            ? "Sorry, I need to cancel my reservation."
            : "Sorry, I need to cancel my reservation request.",
        (at) => cancelReservation(stateRef.current, item, at),
        item.status === "reserved"
          ? "Reservation cancelled. The item is available to others again."
          : "Reservation request cancelled.",
      ).then(() => setDialog(null)),
    confirm: (
      listingId: string,
      onConversation: ThreadContext["onConversation"],
    ) => {
      const item = listing(listingId);
      if (!item) return;
      void withMessage(
        listingId,
        "seller",
        (t) => {
          const holdUntil = t.state.reservations.find(
            (reservation) => reservation.listingId === listingId,
          )?.holdUntil;
          return `Confirmed! It's held for you until ${holdUntil ? formatDeadline(holdUntil) : "pickup"}.`;
        },
        (at) => confirmReservation(stateRef.current, item, at),
        `Confirmed. The item is held for this buyer for ${HOLD_HOURS}h.`,
        onConversation,
      ).catch(failed);
    },
    decline: (
      listingId: string,
      onConversation: ThreadContext["onConversation"],
    ) => {
      const item = listing(listingId);
      if (!item) return;
      void withMessage(
        listingId,
        "seller",
        () => "Sorry, it's no longer available.",
        (at) => declineReservation(stateRef.current, item, at),
        "Marked as no longer available. The buyer has been told.",
        onConversation,
      ).catch(failed);
    },
  };

  function findSimilar(title: string, noticeId?: string) {
    if (noticeId) commit(dismissNotice(stateRef.current, noticeId));
    optionsRef.current.onFindSimilar(title);
  }
  function openRequest(listingId: string) {
    setDialog({ kind: "request", listingId });
  }

  return {
    cardProps(item: Product): {
      statusLabel?: ReactNode;
      availabilityNote?: ReactNode;
    } {
      const view = viewOf(item);
      const note = (text: string) => (
        <p className="availability-note">{text}</p>
      );
      if (view.kind === "pending")
        return {
          availabilityNote: note(
            `Waiting for seller · confirms by ${formatDeadline(view.reservation.replyBy)}`,
          ),
        };
      if (view.kind === "held")
        return {
          statusLabel: (
            <span className="sold-label availability-label mine">
              Reserved for you
            </span>
          ),
          availabilityNote: note(
            `Reserved for you until ${formatDeadline(view.reservation.holdUntil!)}`,
          ),
        };
      if (view.kind === "reserved")
        return {
          statusLabel: (
            <span className="sold-label availability-label">Reserved</span>
          ),
          availabilityNote: view.position
            ? note(`You're #${view.position} in line`)
            : undefined,
        };
      if (view.kind === "open" && view.priorityUntil)
        return {
          availabilityNote: note(
            `Available again · you're first in line for ${formatTimeLeft(view.priorityUntil, now)}`,
          ),
        };
      return {};
    },
    detailPanel(item: Product, onMessage: () => void) {
      return (
        <DetailPanel
          listing={item}
          view={viewOf(item)}
          now={now}
          busy={busy}
          onRequest={() => openRequest(item.id)}
          onCancel={() => setDialog({ kind: "cancel", listingId: item.id })}
          onJoin={() => {
            commit(joinWaitlist(stateRef.current, item, clock()).state);
            optionsRef.current.setToast(
              "You're on the waitlist. We'll tell you if it becomes available.",
            );
          }}
          onLeave={() => commit(leaveWaitlist(stateRef.current, item.id).state)}
          onMessage={onMessage}
          onFindSimilar={() =>
            findSimilar(
              item.title,
              state.notices.find((notice) => notice.listingId === item.id)?.id,
            )
          }
        />
      );
    },
    notices(listingId?: string) {
      const items = state.notices.filter(
        (notice) => !listingId || notice.listingId === listingId,
      );
      return (
        <Notices
          notices={items}
          text={(notice) => noticeText[notice.kind]}
          canRequest={(notice) =>
            listing(notice.listingId)?.status === "active"
          }
          onRequest={(notice) => openRequest(notice.listingId)}
          onFindSimilar={(notice) => findSimilar(notice.title, notice.id)}
          onDismiss={(notice) =>
            commit(dismissNotice(stateRef.current, notice.id))
          }
        />
      );
    },
    threadBanner(context: ThreadContext) {
      const item = listing(context.listingId);
      if (!item) return null;
      const view = viewOf(item);
      if (view.kind !== "pending" && view.kind !== "held") return null;
      return (
        <ThreadBanner
          context={context}
          listing={item}
          reservation={view.reservation}
          now={now}
          busy={busy}
          onConfirm={() => actions.confirm(item.id, context.onConversation)}
          onDecline={() => actions.decline(item.id, context.onConversation)}
        />
      );
    },
    overlay: (
      <>
        <DemoControls
          now={now}
          offsetMs={state.clockOffsetMs}
          busy={busy}
          onSkip={(hours) =>
            sweep(
              skipHours(stateRef.current, hours),
              `Demo clock moved forward ${hours}h. Nothing was due.`,
            )
          }
          onOtherBuyerCancelled={() => {
            const t = releaseOtherReservations(
              stateRef.current,
              optionsRef.current.listings,
              clock(),
            );
            if (!t.statusChanges.length) {
              optionsRef.current.setToast(
                "No listing is reserved by another buyer right now.",
              );
              return;
            }
            commit(t.state, t.statusChanges);
            toastFor(
              t,
              "The other buyer cancelled. The item is available again.",
            );
          }}
          onReset={() => void reset(stateRef.current, false)}
        />
        {dialog?.kind === "request" && dialogListing && (
          <RequestModal
            listing={dialogListing}
            now={now}
            busy={busy}
            onClose={() => setDialog(null)}
            onConfirm={(pickupBy) => actions.request(dialogListing, pickupBy)}
          />
        )}
        {dialog?.kind === "cancel" && dialogListing && (
          <CancelModal
            listing={dialogListing}
            held={viewOf(dialogListing).kind === "held"}
            busy={busy}
            onClose={() => setDialog(null)}
            onConfirm={() => actions.cancel(dialogListing)}
          />
        )}
      </>
    ),
  };
}
