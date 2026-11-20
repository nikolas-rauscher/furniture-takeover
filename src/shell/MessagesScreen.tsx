import type { ReactNode } from "react";
import type { SellerConversation } from "../../shared/messages";
import { draftMessage } from "../../shared/dealMessages";
import type { Product } from "../../shared/marketplace";
import {
  dealTermsFromNegotiation,
  markNegotiationSent,
} from "../../shared/negotiation";
import LazyBoundary from "../components/LazyBoundary";
import {
  NamedOfferPriceContext,
  priceNamedInSearch,
} from "../components/namedOfferPrice";
import type { DealStatusChange } from "../components/ThreadDeal";
import { nearbyMeetingPoint } from "../dealOptions";
import type { useMessagesInbox } from "../hooks/useMessagesInbox";
import type { useNegotiations } from "../hooks/useNegotiations";
import type { ThreadRequests } from "../hooks/useThreadRequests";
import { MessagesPage } from "../screens";

type ThreadBanner = (thread: {
  listingId: string;
  role: "buyer" | "seller";
  onConversation: (conversation: SellerConversation) => void;
}) => ReactNode;

type Actions = {
  onBrowse: () => void;
  onOpenListing: (item: Product) => void;
  /** A thread's note on Pako's reading leads to where that choice is. */
  onReadingSettings: () => void;
  onFindSimilar: (title: string) => void;
  onDeleted: () => void;
};

/** Messages in the mode the app runs in, opening the thread and offer the app asked for. */
export default function MessagesScreen({
  messages,
  threads,
  negotiations,
  listings,
  developerMode,
  location,
  onListingStatus,
  threadBanner,
  actions,
}: {
  messages: ReturnType<typeof useMessagesInbox>;
  threads: ThreadRequests;
  negotiations: ReturnType<typeof useNegotiations>;
  /** The listings and how students see each one. */
  listings: { own: Product[]; shown: (item: Product) => Product };
  developerMode: boolean;
  /** Where the student searches from; the meeting point near it is proposed. */
  location: string;
  onListingStatus: (
    listingId: string,
    status: DealStatusChange,
  ) => Promise<void>;
  threadBanner: ThreadBanner | undefined;
  actions: Actions;
}) {
  const { proposal } = threads;
  const listing = listings.own.find((item) => item.id === threads.listingId);
  /** The offer prepared with Pako is the one being sent from this buyer's thread. */
  const sendsProposal = (listingId: string, role: "buyer" | "seller") =>
    proposal !== undefined &&
    listingId === proposal.listingId &&
    role === "buyer";
  return (
    <NamedOfferPriceContext.Provider
      value={(listingId) => priceNamedInSearch(negotiations.items, listingId)}
    >
      <LazyBoundary label="Loading Messages">
        <MessagesPage
          developerMode={developerMode}
          listingId={threads.listingId}
          onBrowse={actions.onBrowse}
          initialMessage={
            proposal
              ? (proposal.draft?.message ??
                draftMessage(listing?.title ?? "Listing", proposal.terms))
              : threads.draft
          }
          initialTerms={
            proposal && dealTermsFromNegotiation(proposal.terms, new Date())
          }
          offerRequest={threads.offerRequest}
          homePoint={nearbyMeetingPoint(location)}
          onListingStatus={onListingStatus}
          onBeforeSend={(listingId, role) => {
            if (!proposal || !sendsProposal(listingId, role)) return;
            const current = negotiations.current();
            if (
              !current ||
              current.id !== proposal.id ||
              current.version !== proposal.version
            )
              throw new Error(
                "This offer draft changed. Open the latest draft in your conversation with Pako.",
              );
          }}
          onSent={(listingId, role, message) => {
            if (!proposal || !sendsProposal(listingId, role)) return;
            negotiations.commit({
              type: "negotiation_update",
              previousVersion: proposal.version,
              negotiation: markNegotiationSent(
                {
                  ...proposal,
                  draft: { message, version: proposal.version },
                },
                proposal.version,
              ),
            });
            threads.proposalSent();
          }}
          onDeleted={actions.onDeleted}
          threadBanner={threadBanner}
          listings={listings.own.map(listings.shown)}
          {...messages.screen}
          threadRequest={threads.threadRequest}
          pako={{
            available: messages.available,
            autoRead: messages.autoRead,
            remaining: messages.remaining,
            onRemaining: messages.setRemaining,
            onOpenSettings: actions.onReadingSettings,
            onFindSimilar: actions.onFindSimilar,
          }}
          listing={listing}
          onOpenListing={(id) => {
            const item = listings.own.find((entry) => entry.id === id);
            if (item) actions.onOpenListing(item);
          }}
        />
      </LazyBoundary>
    </NamedOfferPriceContext.Provider>
  );
}
