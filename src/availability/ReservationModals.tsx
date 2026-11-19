import { useState } from "react";
import { Clock, Package, Search } from "@/components/icons";
import Modal from "../components/Modal";
import Pako from "../components/onboarding/Pako";
import { Button } from "../components/ui/button";
import type { Product } from "../../shared/marketplace";
import { HOLD_HOURS, OPEN_QUESTIONS, SELLER_REPLY_HOURS } from "./config";
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
    <Modal title="Ask to reserve" onClose={onClose}>
      <div className="reservation-intro">
        <Pako mood="listen" size={64} />
        <p>
          Ask the seller to hold <strong>{listing.title}</strong> for you,
          instead of asking whether it&apos;s still there.
        </p>
      </div>
      <ol className="reservation-steps">
        <li>
          <span className="reservation-step-icon" aria-hidden="true">
            <Clock size={18} />
          </span>
          <span>
            <strong>The seller has {SELLER_REPLY_HOURS} h to confirm.</strong>{" "}
            It takes them one tap.
          </span>
        </li>
        <li>
          <span className="reservation-step-icon" aria-hidden="true">
            <Package size={18} />
          </span>
          <span>
            <strong>
              Once confirmed, it&apos;s held for you for {HOLD_HOURS} h
            </strong>{" "}
            so you can pick it up
            {listing.pickupPoint ? ` at ${listing.pickupPoint.name}` : ""}.
          </span>
        </li>
        <li>
          <span className="reservation-step-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <span>
            <strong>No reply within {SELLER_REPLY_HOURS} h?</strong> The listing
            is hidden, and Pako helps you find something similar.
          </span>
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
      <div className="reservation-message">
        <span>This goes to the seller in your chat:</span>
        <p>{reservationRequestMessage(day)}</p>
      </div>
      <p className="availability-open-questions">{OPEN_QUESTIONS}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button className="button secondary" disabled={busy} onClick={onClose}>
          Not now
        </Button>
        <Button
          animateIcon
          className="button primary"
          disabled={busy}
          onClick={() => {
            setError("");
            onConfirm(day).catch((reason) => setError(failure(reason)));
          }}
        >
          {busy ? "Sending…" : "Send request"}
        </Button>
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
      title={held ? "Cancel your reservation?" : "Cancel your request?"}
      onClose={onClose}
    >
      <p className="modal-intro">
        {held
          ? `${listing.title} will be available to other buyers again, starting with the first person on the waitlist.`
          : `The seller will no longer see your request for ${listing.title}.`}{" "}
        A short message goes to the seller.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button className="button secondary" disabled={busy} onClick={onClose}>
          Keep it
        </Button>
        <Button
          className="button danger"
          disabled={busy}
          onClick={() => {
            setError("");
            onConfirm().catch((reason) => setError(failure(reason)));
          }}
        >
          {busy ? "Sending…" : held ? "Cancel reservation" : "Cancel request"}
        </Button>
      </div>
    </Modal>
  );
}
