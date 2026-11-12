import { Clock, MapPin } from "lucide-react";
import type { Product } from "../../shared/marketplace";
import { HOLD_HOURS, SELLER_REPLY_HOURS } from "./config";
import { formatDay, formatDeadline, formatTimeLeft } from "./format";
import type { ListingAvailability } from "./reservations";

type DetailPanelProps = {
  listing: Product;
  view: ListingAvailability;
  now: Date;
  busy: boolean;
  onRequest(): void;
  onCancel(): void;
  onJoin(): void;
  onLeave(): void;
  onMessage(): void;
  onFindSimilar(): void;
};

/** Replaces the detail page's "Message seller" button while the flag is on. */
export default function DetailPanel({
  listing,
  view,
  now,
  busy,
  onRequest,
  onCancel,
  onJoin,
  onLeave,
  onMessage,
  onFindSimilar,
}: DetailPanelProps) {
  const messageSeller = (enabled: boolean) => (
    <button
      className="button secondary full"
      disabled={!enabled}
      onClick={onMessage}
    >
      Message seller
    </button>
  );
  if (view.kind === "pending")
    return (
      <div className="availability-panel">
        <div className="availability-status" role="status">
          <Clock size={17} aria-hidden="true" />
          <div>
            <strong>
              Waiting for seller · confirms by{" "}
              {formatDeadline(view.reservation.replyBy)}
            </strong>
            <span>
              You asked to pick it up by {formatDay(view.reservation.pickupBy)}.
              The seller has {formatTimeLeft(view.reservation.replyBy, now)}{" "}
              left to reply.
            </span>
          </div>
        </div>
        {messageSeller(true)}
        <button className="text-button availability-cancel" onClick={onCancel}>
          Cancel request
        </button>
      </div>
    );
  if (view.kind === "held")
    return (
      <div className="availability-panel">
        <div className="availability-status confirmed" role="status">
          <MapPin size={17} aria-hidden="true" />
          <div>
            <strong>
              Reserved for you until{" "}
              {formatDeadline(view.reservation.holdUntil!)}
            </strong>
            <span>
              Pickup:{" "}
              {listing.pickupPoint
                ? `${listing.pickupPoint.name}, ${listing.pickupPoint.address}`
                : listing.location}
            </span>
          </div>
        </div>
        {messageSeller(true)}
        <button className="text-button availability-cancel" onClick={onCancel}>
          Cancel reservation
        </button>
      </div>
    );
  if (view.kind === "reserved")
    return (
      <div className="availability-panel">
        <div className="availability-status muted" role="status">
          <div>
            <strong>
              {view.position
                ? `You're #${view.position} in line.`
                : "Reserved by another buyer."}
            </strong>
            <span>
              {view.position
                ? "We'll tell you if the reservation ends. You'll get first chance to reserve it."
                : "Join the waitlist to get first chance if their reservation ends."}
            </span>
          </div>
        </div>
        {view.position ? (
          <button className="text-button availability-cancel" onClick={onLeave}>
            Leave waitlist
          </button>
        ) : (
          <button className="button primary full" onClick={onJoin}>
            Join waitlist
          </button>
        )}
        {messageSeller(false)}
      </div>
    );
  if (view.kind === "sold" || view.kind === "removed")
    return (
      <div className="availability-panel">
        <div className="availability-status muted" role="status">
          <div>
            <strong>
              {view.kind === "sold"
                ? view.declined
                  ? "The seller says it's no longer available."
                  : "This item has been sold."
                : "This listing was removed."}
            </strong>
          </div>
        </div>
        <button className="button primary full" onClick={onFindSimilar}>
          Find similar
        </button>
        {messageSeller(false)}
      </div>
    );
  return (
    <div className="availability-panel">
      {view.priorityUntil && (
        <div className="availability-status confirmed" role="status">
          <div>
            <strong>It's available again.</strong>
            <span>
              You're first in line for {formatTimeLeft(view.priorityUntil, now)}
              .
            </span>
          </div>
        </div>
      )}
      <button
        className="button primary full"
        disabled={busy}
        onClick={onRequest}
      >
        Request reservation
      </button>
      {messageSeller(true)}
      <p className="quiet-caption">
        The seller has {SELLER_REPLY_HOURS}h to confirm. Then it's held for you
        for {HOLD_HOURS}h.
      </p>
    </div>
  );
}
