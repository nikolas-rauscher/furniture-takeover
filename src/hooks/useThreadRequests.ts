import { useState } from "react";
import type { Product } from "../../shared/marketplace";
import type { Negotiation } from "../../shared/negotiation";
import type { ThreadRequest } from "../components/messagesProps";
import type { InboxDeal } from "../inboxDeals";
import type { readRoute, View } from "../navigation";

type Route = ReturnType<typeof readRoute>;

export type ThreadRequests = ReturnType<typeof useThreadRequests>;

/**
 * Which conversation Messages opens and what waits in its composer: a
 * listing's thread, an offer prepared with Pako, or a deal's conversation.
 */
export function useThreadRequests({
  signedIn,
  initialRoute,
  navigate,
  replaceRoute,
}: {
  signedIn: boolean;
  initialRoute: Route;
  navigate: (view: View) => void;
  replaceRoute: (url: string) => void;
}) {
  const [listingId, setListingId] = useState<string | undefined>(
    initialRoute.view === "messages" ? initialRoute.listingId : undefined,
  );
  /** Changes on each "Draft an offer" tap, so its thread opens the offer card again. */
  const [offerRequest, setOfferRequest] = useState<number>();
  /** A conversation to open by itself, such as a seller's deal from Home. */
  const [threadRequest, setThreadRequest] = useState<ThreadRequest>();
  const [proposal, setProposal] = useState<Negotiation | undefined>();
  /** A message the app prepared for a buyer's thread without an offer, such as a follow-up. */
  const [draft, setDraft] = useState<string>();

  function open(nextListingId?: string, nextProposal?: Negotiation) {
    if (!signedIn) {
      navigate("settings");
      return;
    }
    if (nextListingId) {
      setProposal(nextProposal);
      setDraft(undefined);
      setListingId(nextListingId);
    }
    navigate("messages");
    if (nextListingId)
      replaceRoute(`#messages/${encodeURIComponent(nextListingId)}`);
  }
  return {
    listingId,
    offerRequest,
    threadRequest,
    proposal,
    draft,
    open,
    /** "Draft an offer": the listing's thread opens with the offer card, nothing sent yet. */
    openOffer(item: Product) {
      open(item.id);
      setOfferRequest(Date.now());
    },
    /**
     * Opens the conversation a deal is in, a buyer's by its listing and a
     * seller's by itself, with a message prepared in its composer if given.
     */
    openDeal(item: InboxDeal, message?: string) {
      if (item.role === "buyer") {
        open(item.listingId);
        setDraft(message);
        return;
      }
      setThreadRequest({ id: item.threadId, draft: message });
      navigate("messages");
    },
    /** A discarded offer leaves no unsent conversation waiting in Messages. */
    forget(discardedListingId: string) {
      setProposal((current) =>
        current?.listingId === discardedListingId ? undefined : current,
      );
      setListingId((current) =>
        current === discardedListingId ? undefined : current,
      );
    },
    proposalSent: () => setProposal(undefined),
    /** Back or Forward led to Messages, or away from it. */
    followRoute(route: Route) {
      setListingId(route.view === "messages" ? route.listingId : undefined);
    },
  };
}
