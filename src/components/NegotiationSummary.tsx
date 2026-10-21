import type { Negotiation } from "../../shared/negotiation";
import { money } from "../../shared/marketplace";
export default function NegotiationSummary({
  proposal,
  title,
  onReview,
  onContinue,
  onDiscard,
  disabled = false,
  unavailable = false,
  compact = false,
}: {
  proposal: Negotiation;
  title: string;
  onReview: () => void;
  onContinue?: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  unavailable?: boolean;
  compact?: boolean;
}) {
  if (compact)
    return (
      <section
        className="proposal-chat-bar"
        aria-label={`Offer proposal for ${title}`}
      >
        <div>
          <strong title={title}>{title}</strong>
          <span>
            {unavailable
              ? "Listing unavailable"
              : [
                  proposal.terms.amount === null
                    ? "Offer draft"
                    : money(proposal.terms.amount),
                  proposal.draft ? "Message ready" : "Draft in progress",
                ].join(" · ")}
          </span>
        </div>
        <button
          type="button"
          className="button"
          disabled={disabled || unavailable}
          onClick={onReview}
        >
          Open chat
        </button>
        <button
          type="button"
          className="text-button proposal-dismiss"
          disabled={disabled}
          onClick={onDiscard}
          aria-label="Discard proposal"
        >
          ×
        </button>
      </section>
    );
  return (
    <section
      className="negotiation-summary"
      aria-label={`Offer proposal for ${title}`}
    >
      <div>
        <strong>{title}</strong>
        <span>
          {proposal.draft ? "Draft ready for review" : "Your offer proposal"}
        </span>
      </div>
      <dl>
        <div>
          <dt>Offer</dt>
          <dd>
            {proposal.terms.amount === null
              ? "Not decided"
              : money(proposal.terms.amount)}
          </dd>
        </div>
        <div>
          <dt>Handover</dt>
          <dd>{proposal.terms.fulfillment ?? "Not decided"}</dd>
        </div>
        {proposal.terms.fulfillment !== "shipping" && (
          <>
            <div>
              <dt>Time proposal</dt>
              <dd>{proposal.terms.pickupTime ?? "Not decided"}</dd>
            </div>
            <div>
              <dt>Meeting point proposal</dt>
              <dd>{proposal.terms.pickupPoint ?? "Ask the seller"}</dd>
            </div>
          </>
        )}
      </dl>
      {proposal.draft && (
        <div className="proposal-message-preview" aria-label="Message draft">
          <strong>Message to seller</strong>
          <p>{proposal.draft.message}</p>
        </div>
      )}
      <p>
        {unavailable
          ? "This listing is no longer available. You can discard the proposal."
          : "Draft only · Awaiting seller agreement"}
      </p>
      <div className="offer-draft-actions">
        <button
          className="button primary"
          disabled={disabled || unavailable}
          onClick={onReview}
        >
          Open seller chat
        </button>
        {onContinue && (
          <button
            className="text-button"
            disabled={disabled}
            onClick={onContinue}
          >
            Continue with agent
          </button>
        )}
        <button className="text-button" disabled={disabled} onClick={onDiscard}>
          Discard proposal
        </button>
      </div>
    </section>
  );
}

/** A snapshot of the actual tool-created message, kept with its chat turn. */
export function MessageDraftPreview({
  proposal,
  title,
  onReview,
  sent = false,
}: {
  proposal: Negotiation;
  title: string;
  onReview?: () => void;
  sent?: boolean;
}) {
  if (!proposal.draft || proposal.status !== "draft") return null;
  return (
    <section
      className="chat-message-draft"
      aria-label={`Message draft for ${title}`}
    >
      <div className="chat-message-draft-heading">
        <strong>Message to seller</strong>
        <span>
          {sent ? "Sent" : onReview ? "Ready for review" : "Earlier draft"}
        </span>
      </div>
      <p>{proposal.draft.message}</p>
      {onReview && (
        <button type="button" className="button primary" onClick={onReview}>
          Open seller chat
        </button>
      )}
      <small>
        {sent
          ? "Message sent · View it in Messages"
          : onReview
            ? "Draft only · Not sent"
            : "This is a previous version of the message."}
      </small>
    </section>
  );
}
