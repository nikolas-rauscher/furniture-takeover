import { useState } from "react";
import Modal from "../components/Modal";
import type { Product } from "../../shared/marketplace";
import { HOLD_HOURS, SELLER_REPLY_HOURS } from "./config";
import { pickupDays, reservationRequestMessage } from "./format";

const failure = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Could not send the message. Nothing was changed.";

export function RequestModal({
  listing,
  now,
  busy,
  onClose,
  onConfirm,
}: {
  listing: Product;
  now: Date;
  busy: boolean;
  onClose(): void;
  onConfirm(pickupBy: string): Promise<void>;
}) {
  const [days] = useState(() => pickupDays(now));
  const [day, setDay] = useState(days[1].day);
  const [error, setError] = useState("");
  return (
    <Modal title="Request reservation" onClose={onClose}>
      <p className="modal-intro">
        Ask the seller to hold <strong>{listing.title}</strong> for you instead
        of asking whether it's still available.
      </p>
      <ol className="reservation-steps">
        <li>
          <strong>The seller has {SELLER_REPLY_HOURS}h to confirm.</strong> It
          takes them one tap.
        </li>
        <li>
          <strong>Once confirmed, it's held for you for {HOLD_HOURS}h</strong>{" "}
          so you can pick it up
          {listing.pickupPoint ? ` at ${listing.pickupPoint.name}` : ""}.
        </li>
        <li>
          <strong>No reply within {SELLER_REPLY_HOURS}h?</strong> The listing is
          removed, so nobody else asks about it. We'll help you find something
          similar.
        </li>
      </ol>
      <fieldset className="pickup-days">
        <legend>When can you pick it up?</legend>
        {days.map((option) => (
          <label key={option.day}>
            <input
              type="radio"
              name="reservation-pickup-day"
              value={option.day}
              checked={day === option.day}
              onChange={() => setDay(option.day)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <p className="quiet-caption">
        We'll post this in your conversation with the seller: “
        {reservationRequestMessage(day)}”
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="modal-actions">
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={onClose}
        >
          Not now
        </button>
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => {
            setError("");
            onConfirm(day).catch((reason) => setError(failure(reason)));
          }}
        >
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
    </Modal>
  );
}

export function CancelModal({
  listing,
  held,
  busy,
  onClose,
  onConfirm,
}: {
  listing: Product;
  held: boolean;
  busy: boolean;
  onClose(): void;
  onConfirm(): Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <Modal
      title={held ? "Cancel reservation?" : "Cancel request?"}
      onClose={onClose}
    >
      <p className="modal-intro">
        {held
          ? `${listing.title} will be available to other buyers again, starting with the first person on the waitlist.`
          : `The seller will no longer see your request for ${listing.title}.`}{" "}
        We'll post a short message to the seller.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={onClose}
        >
          Keep it
        </button>
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => {
            setError("");
            onConfirm().catch((reason) => setError(failure(reason)));
          }}
        >
          {busy ? "Sending…" : held ? "Cancel reservation" : "Cancel request"}
        </button>
      </div>
    </Modal>
  );
}
