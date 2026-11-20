import type { ReactNode } from "react";
import { nudgeMessage } from "../../shared/dealMessages";
import type { Product } from "../../shared/marketplace";
import HomeDeals from "../components/HomeDeals";
import Pako from "../components/onboarding/Pako";
import ProductGrid from "../components/ProductGrid";
import type { InboxDeal } from "../inboxDeals";
import type { InboxDeals } from "../hooks/useInboxDeals";
import type { useNegotiations } from "../hooks/useNegotiations";
import ProposalCard, { type OfferCards } from "./ProposalCard";

type Listings = {
  visible: Product[];
  /** They loaded, or loading failed and the status says why. */
  settled: boolean;
  render: (item: Product, arriving: boolean) => ReactNode;
};

/** Home below the search: offer drafts, live deals, notices and the listings nearby. */
export default function HomeFeed({
  negotiations,
  offers,
  deals,
  onOpenDeal,
  onSeeAllDeals,
  notices,
  listings,
  cloud,
  webSearch,
}: {
  negotiations: ReturnType<typeof useNegotiations>;
  offers: OfferCards;
  deals: InboxDeals["homeDeals"];
  onOpenDeal: (item: InboxDeal, message?: string) => void;
  onSeeAllDeals: () => void;
  notices: ReactNode;
  listings: Listings;
  cloud: boolean;
  /** Pako can search other sites. */
  webSearch: boolean | undefined;
}) {
  return (
    <>
      {negotiations.error && <p role="alert">{negotiations.error}</p>}
      {negotiations.items
        .filter((item) => item.status === "draft")
        .map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} offers={offers} />
        ))}
      <HomeDeals
        deals={deals.map(({ item, listing, view, waited }) => ({
          id: item.threadId,
          title: listing.title,
          image: listing.image,
          view,
          onOpen: () => onOpenDeal(item),
          onFollowUp: waited
            ? () => onOpenDeal(item, nudgeMessage(item.role, listing.title))
            : undefined,
        }))}
        onSeeAll={onSeeAllDeals}
      />
      {notices}
      {listings.settled && listings.visible.length > 0 && (
        <>
          <div className="section-heading">
            <h2>Listings nearby</h2>
            <p>
              {cloud
                ? "Listed on takeover"
                : "From students around EPFL, UNIL and the FMEL residences."}
            </p>
          </div>
          <ProductGrid items={listings.visible} renderProduct={listings.render} />
        </>
      )}
      {listings.settled && !listings.visible.length && (
        <div className="home-empty">
          <Pako mood="idle" size={72} still />
          <div>
            <h2>No listings to show yet</h2>
            <p>
              {webSearch
                ? "Ask me to search other sites, or list an item."
                : "Be the first: list an item with a photo."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
