import type { Product } from "../../shared/marketplace";
import type { Negotiation } from "../../shared/negotiation";
import NegotiationSummary from "../components/NegotiationSummary";

/** What an offer draft's card can do, the same on Home and in the chat. */
export type OfferCards = {
  own: Product[];
  /** Pako is working, so the drafts wait. */
  running: boolean;
  /** Opens the draft in its listing's conversation. */
  review: (proposal: Negotiation, item: Product | undefined) => void;
  continue: (item: Product, proposal: Negotiation) => void;
  discard: (proposal: Negotiation) => void;
};

/** An offer draft prepared with Pako, with ways to review, continue or discard it. */
export default function ProposalCard({
  proposal,
  compact = false,
  offers,
}: {
  proposal: Negotiation;
  compact?: boolean;
  offers: OfferCards;
}) {
  const item = offers.own.find((entry) => entry.id === proposal.listingId);
  const available = item?.status === "active";
  return (
    <NegotiationSummary
      proposal={proposal}
      compact={compact}
      title={item?.title ?? "Unavailable listing"}
      image={item?.image}
      unavailable={!available}
      disabled={offers.running}
      onReview={() => offers.review(proposal, available ? item : undefined)}
      onContinue={
        available && item ? () => offers.continue(item, proposal) : undefined
      }
      onDiscard={() => offers.discard(proposal)}
    />
  );
}
