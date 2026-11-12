import { MessageCircle, Trash2 } from "lucide-react";
import "./negotiation-summary.css";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Item,
  ItemHeader,
  ItemContent,
  ItemActions,
  ItemTitle,
  ItemFooter,
} from "./ui/item";
import type { Negotiation } from "../../shared/negotiation";
import { money } from "../../shared/marketplace";
export default function NegotiationSummary({
  proposal,
  title,
  image,
  onReview,
  onContinue,
  onDiscard,
  disabled = false,
  unavailable = false,
  compact = false,
}: {
  proposal: Negotiation;
  title: string;
  image?: string;
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
        <Button
          type="button"
          className="button"
          disabled={disabled || unavailable}
          onClick={onReview}
        >
          Open chat
        </Button>
        <Button
          type="button"
          className="text-button proposal-dismiss"
          disabled={disabled}
          onClick={onDiscard}
          aria-label="Discard proposal"
        >
          ×
        </Button>
      </section>
    );
  return (
    <Item
      render={<section />}
      variant="outline"
      className="negotiation-summary"
      aria-label={`Offer proposal for ${title}`}
    >
      <ItemHeader className="proposal-heading">
        <div className="proposal-identity">
          {image && (
            <img
              key={image}
              src={image}
              alt=""
              className="proposal-thumbnail"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
          <ItemTitle className="proposal-title">{title}</ItemTitle>
        </div>
        <Badge variant={unavailable ? "destructive" : "secondary"}>
          {unavailable
            ? "Listing unavailable"
            : proposal.draft
              ? "Ready for review"
              : "In progress"}
        </Badge>
      </ItemHeader>
      <ItemContent
        className={`proposal-body${proposal.draft ? " has-message" : ""}`}
      >
        <dl className="proposal-terms">
          <div>
            <dt>Offer</dt>
            <dd className="proposal-amount">
              {proposal.terms.amount === null
                ? "Not decided"
                : money(proposal.terms.amount)}
            </dd>
          </div>
          <div>
            <dt>Handover</dt>
            <dd>
              {proposal.terms.fulfillment === "pickup"
                ? "Pickup"
                : proposal.terms.fulfillment === "shipping"
                  ? "Shipping"
                  : "Not decided"}
            </dd>
          </div>
          {proposal.terms.fulfillment !== "shipping" && (
            <>
              <div>
                <dt>Pickup time</dt>
                <dd>{proposal.terms.pickupTime ?? "Not decided"}</dd>
              </div>
              <div>
                <dt>Meeting point</dt>
                <dd>{proposal.terms.pickupPoint ?? "Ask the seller"}</dd>
              </div>
            </>
          )}
        </dl>
        {proposal.draft && (
          <section className="proposal-message" aria-label="Message draft">
            <h3>Message to seller</h3>
            <p>{proposal.draft.message}</p>
          </section>
        )}
      </ItemContent>
      <ItemFooter className="proposal-footer">
        <p className="proposal-note">
          {unavailable
            ? "This listing is no longer available. You can discard the proposal."
            : "Not sent · Review and send in seller chat"}
        </p>
        <div
          className="proposal-actions"
          role="group"
          aria-label="Proposal actions"
        >
          <Button
            variant="default"
            className="proposal-review"
            disabled={disabled || unavailable}
            onClick={onReview}
          >
            <MessageCircle size={16} aria-hidden="true" />
            Open seller chat
          </Button>
          {onContinue && (
            <Button
              variant="outline"
              disabled={disabled || unavailable}
              onClick={onContinue}
            >
              Continue with agent
            </Button>
          )}
          <Button
            variant="ghost"
            className="proposal-discard"
            disabled={disabled}
            onClick={onDiscard}
          >
            <Trash2 size={15} aria-hidden="true" />
            Discard proposal
          </Button>
        </div>
      </ItemFooter>
    </Item>
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
    <Item
      render={<section />}
      className="chat-message-draft"
      aria-label={`Message draft for ${title}`}
    >
      <ItemHeader className="chat-message-draft-heading">
        <strong>Message to seller</strong>
        <Badge variant="secondary">
          {sent ? "Sent" : onReview ? "Ready for review" : "Earlier draft"}
        </Badge>
      </ItemHeader>
      <ItemContent>
        <p>{proposal.draft.message}</p>
      </ItemContent>
      {onReview && (
        <ItemActions>
          <Button
            animateIcon
            type="button"
            className="button primary"
            onClick={onReview}
          >
            Open seller chat
          </Button>
        </ItemActions>
      )}
      <small>
        {sent
          ? "Message sent · View it in Messages"
          : onReview
            ? "Draft only · Not sent"
            : "This is a previous version of the message."}
      </small>
    </Item>
  );
}
