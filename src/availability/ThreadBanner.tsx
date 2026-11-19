import { TriangleAlert } from "lucide-react";
import type { Product } from "../../shared/marketplace";
import type { SellerConversation } from "../../shared/messages";
import { HOLD_HOURS } from "./config";
import { formatDay, formatDeadline, formatTimeLeft } from "./format";
import type { Reservation } from "./reservations";

export type ThreadContext = {
  listingId: string;
  role: "buyer" | "seller";
  /** Shows a posted message in the open thread without waiting for polling. */
  onConversation(conversation: SellerConversation): void;
};

type ThreadBannerProps = {
  context: ThreadContext;
  listing: Product;
  reservation: Reservation;
  now: Date;
  busy: boolean;
  onConfirm(): void;
  onDecline(): void;
};

/** Shown above a Messages thread with an open reservation. */
export default function ThreadBanner({
  context,
  listing,
  reservation,
  now,
  busy,
  onConfirm,
  onDecline,
}: ThreadBannerProps) {
  if (reservation.status === "held")
    return (
      <p className="thread-reservation compact" role="status">
        {context.role === "seller"
          ? `Held for this buyer until ${formatDeadline(reservation.holdUntil!)}.`
          : `Reserved for you until ${formatDeadline(reservation.holdUntil!)}.`}
      </p>
    );
  if (context.role === "buyer")
    return (
      <p className="thread-reservation compact" role="status">
        Reservation requested · the seller confirms by{" "}
        {formatDeadline(reservation.replyBy)}.
      </p>
    );
  const left = formatTimeLeft(reservation.replyBy, now);
  return (
    <section className="thread-reservation" aria-label="Reservation request">
      <p className="thread-reservation-summary">
        <strong>Reservation request · {listing.title}</strong>
        <span>
          Pickup by {formatDay(reservation.pickupBy)} · {left} left
        </span>
      </p>
      <p className="thread-reservation-warning">
        <TriangleAlert size={15} aria-hidden="true" />
        Reply within {left} or your listing will be hidden.
      </p>
      <div className="thread-reservation-actions">
        <button
          className="button primary small"
          disabled={busy}
          onClick={onConfirm}
        >
          Confirm & hold {HOLD_HOURS}h
        </button>
        <button
          className="button secondary small"
          disabled={busy}
          onClick={onDecline}
        >
          It's no longer available
        </button>
      </div>
    </section>
  );
}
