import { CalendarCheck, Clock } from "@/components/icons";
import { Button } from "../components/ui/button";
import type { Product } from "../../shared/marketplace";
import type { SellerConversation } from "../../shared/messages";
import { HOLD_HOURS, OPEN_QUESTIONS } from "./config";
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

/** Pinned above a Messages thread with an open reservation, like the deal bar. */
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
      <p className="chip thread-reservation-chip" role="status">
        <CalendarCheck size={15} aria-hidden="true" />
        {context.role === "seller"
          ? `Reserved for this buyer until ${formatDeadline(reservation.holdUntil!)}`
          : `Reserved for you until ${formatDeadline(reservation.holdUntil!)}`}
      </p>
    );
  if (context.role === "buyer")
    return (
      <p className="chip thread-reservation-chip" role="status">
        <Clock size={15} aria-hidden="true" />
        Reservation requested · the seller has until{" "}
        {formatDeadline(reservation.replyBy)} to respond
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
        <Clock size={15} aria-hidden="true" />
        Reply within {left}, or your listing is hidden.
      </p>
      <div className="thread-reservation-actions">
        <Button
          className="button primary small"
          disabled={busy}
          onClick={onConfirm}
        >
          Confirm reservation · {HOLD_HOURS} h
        </Button>
        <Button
          className="button secondary small"
          disabled={busy}
          onClick={onDecline}
        >
          Mark sold
        </Button>
      </div>
      <p className="availability-open-questions">{OPEN_QUESTIONS}</p>
    </section>
  );
}
