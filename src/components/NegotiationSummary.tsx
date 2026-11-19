import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Item, ItemHeader, ItemContent, ItemActions } from "./ui/item";
import { X } from "@/components/icons";
import type { Negotiation } from "../../shared/negotiation";
import { PakoLabel } from "./ChatParts";
import { DealTermsGrid, DealTile, termPrice } from "./DealTerms";
import "./negotiation.css";

/** The agreed terms slide up like the deal card in the intro. */
const SLIDE_UP = { type: "spring", stiffness: 380, damping: 32 } as const;
/** What an offer draft's tiles say while Pako and the buyer have not settled a term. */
const UNDECIDED = {
  amount: "Not decided",
  fulfillment: "Not decided",
  pickupTime: "Not decided",
  pickupPoint: "Ask the seller",
};

function dealStatus(proposal: Negotiation, unavailable: boolean) {
  if (unavailable) return "Listing unavailable";
  return proposal.draft ? "Ready for review" : "In progress";
}

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
      <motion.section
        className="deal-bar"
        aria-label={`Offer proposal for ${title}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SLIDE_UP}
      >
        <DealTile image={image} />
        <div className="deal-bar-copy">
          <strong title={title}>{title}</strong>
          <span>
            {unavailable
              ? "Listing unavailable"
              : [
                  proposal.terms.amount === null
                    ? "Offer draft"
                    : termPrice(proposal.terms.amount),
                  proposal.draft ? "Message ready" : "Draft in progress",
                ].join(" · ")}
          </span>
        </div>
        <Button
          type="button"
          className="button primary small"
          disabled={disabled || unavailable}
          onClick={onReview}
        >
          Open chat
        </Button>
        <Button
          type="button"
          className="icon-button deal-bar-dismiss"
          disabled={disabled}
          onClick={onDiscard}
          aria-label="Discard proposal"
        >
          <X size={16} />
        </Button>
      </motion.section>
    );
  return (
    <motion.section
      className="deal-card offer-proposal"
      data-unavailable={unavailable || undefined}
      aria-label={`Offer proposal for ${title}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SLIDE_UP}
    >
      <div className="deal-card-item">
        <DealTile image={image} />
        <div className="deal-card-heading">
          <strong>{title}</strong>
          <span>
            <PakoLabel>Pako for you</PakoLabel>
            <span
              className="chip deal-card-status"
              data-tone={unavailable ? "danger" : undefined}
            >
              {dealStatus(proposal, unavailable)}
            </span>
          </span>
        </div>
      </div>
      <DealTermsGrid terms={proposal.terms} unknown={UNDECIDED} />
      {proposal.draft && (
        <div className="deal-card-message" aria-label="Message draft">
          <strong>Message to seller</strong>
          <p className="deal-card-bubble">{proposal.draft.message}</p>
        </div>
      )}
      <p className="deal-card-note">
        {unavailable
          ? "This listing is no longer available. You can discard the proposal."
          : "Not sent · Review and send in seller chat"}
      </p>
      <div className="deal-card-actions">
        <Button
          animateIcon
          className="button primary"
          disabled={disabled || unavailable}
          onClick={onReview}
        >
          Open seller chat
        </Button>
        {onContinue && (
          <Button
            className="button quiet"
            disabled={disabled}
            onClick={onContinue}
          >
            Continue with Pako
          </Button>
        )}
        <Button
          className="button quiet"
          disabled={disabled}
          onClick={onDiscard}
        >
          Discard proposal
        </Button>
      </div>
    </motion.section>
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
      className="pako-draft"
      aria-label={`Message draft for ${title}`}
    >
      <ItemHeader className="pako-draft-heading">
        <PakoLabel>Pako for you</PakoLabel>
        <Badge variant="secondary">
          {sent ? "Sent" : onReview ? "Ready for review" : "Earlier draft"}
        </Badge>
      </ItemHeader>
      <ItemContent className="pako-draft-content">
        <strong>Message to seller</strong>
        <p className="pako-draft-bubble">{proposal.draft.message}</p>
      </ItemContent>
      {onReview && (
        <ItemActions>
          <Button
            animateIcon
            type="button"
            className="button primary small"
            onClick={onReview}
          >
            Open seller chat
          </Button>
        </ItemActions>
      )}
      <small className="pako-draft-note">
        {sent
          ? "Message sent · View it in Messages"
          : onReview
            ? "Draft only · Not sent"
            : "This is a previous version of the message."}
      </small>
    </Item>
  );
}
