import type { ReactNode } from "react";
import { listingPhotos } from "../../shared/listingPhotos";
import type { Product } from "../../shared/marketplace";
import AskPakoMenu, { LISTING_REQUESTS } from "../components/AskPakoMenu";
import LazyBoundary from "../components/LazyBoundary";
import { saveActionLabel } from "../listingSaveWords";
import { listingPickupMinimum } from "../listingValidation";
import { pendingPrice } from "../listingQuestions";
import { demandLadder, similarListings } from "../alerts/matching";
import SellerInsight from "../alerts/SellerInsight";
import type { PakoStatus } from "../hooks/usePakoStatus";
import type { SellSession } from "../hooks/useSellSession";
import { BatchSellFlow, ListingConversation, SellFlow } from "../screens";
import type { SavedSearch } from "../searchRequest";

/** What the seller sees about the market while writing: similar listings, and saved searches that would match. */
type Market = {
  listings: Product[];
  savedSearches: SavedSearch[];
  /** Saved-search counts are a developer preview. */
  developerMode: boolean;
};

/** Writing one listing: photos, Pako's draft and conversation, and the details. */
export function SellPage({
  sell,
  pako,
  cloud,
  savingListings,
  market,
  footnote,
  onBack,
  onAccount,
}: {
  sell: SellSession;
  pako: PakoStatus;
  cloud: boolean;
  savingListings: boolean;
  market: Market;
  footnote: ReactNode;
  onBack: () => void;
  onAccount: () => void;
}) {
  const { draft, listing } = sell;
  return (
    <>
      <LazyBoundary label="Loading selling">
        <SellFlow
          draft={draft}
          step={sell.step}
          editing={!!sell.editingListing}
          pickupMin={listingPickupMinimum(draft.pickup, sell.editingItem)}
          busy={(sell.busy && !sell.starting) || savingListings}
          cloud={cloud}
          photoReading={sell.photoReading}
          uploadError={sell.uploadError}
          liveAgent={pako.configured}
          photoInsight={sell.analysis.insight}
          pakoAbsence={pako.absence}
          pakoBack={pako.quotaResets || undefined}
          manual={sell.manual}
          onFillIn={sell.fillInDetails}
          onRetryPako={pako.refresh}
          onBack={onBack}
          onDraftChange={listing.editDraft}
          agentWorking={sell.starting || listing.running}
          suggestedPrice={pendingPrice(
            [...listing.state.history, listing.state],
            draft,
          )}
          onReviewPrice={listing.decidingPrice ? listing.reviewPrice : undefined}
          insight={
            <SellerInsight
              similar={similarListings(
                market.listings,
                draft.title,
                sell.editingListing ?? undefined,
              )}
              ladder={
                market.developerMode
                  ? demandLadder(market.savedSearches, {
                      title: draft.title,
                      price: draft.price.trim() ? Number(draft.price) : Number.NaN,
                      condition: draft.condition,
                      pickupBy: draft.pickup,
                    })
                  : undefined
              }
            />
          }
          agentConversation={
            <ListingConversation
              listing={listing}
              draft={draft}
              starting={sell.starting}
              editing={Boolean(sell.editingListing)}
              saveAction={saveActionLabel({
                cloud,
                editing: Boolean(sell.editingListing),
                batch: sell.batch,
              })}
              configured={pako.configured}
              asleep={pako.quotaExhausted}
              onManual={sell.fillInDetails}
            />
          }
          agentTools={
            <AskPakoMenu
              requests={LISTING_REQUESTS}
              disabled={!pako.configured || listing.running}
              onAsk={(request) => void listing.send(request, {}, true)}
            />
          }
          quota={pako.quota}
          onAccount={onAccount}
          onPhotoSelected={sell.upload}
          onCreateDraft={() => void sell.generateDraft()}
          sortFailed={sell.analysis.sortFailed}
          onSeparate={sell.separateItems}
          onKeepTogether={sell.analysis.keepTogether}
          onSortYourself={() =>
            sell.separateItems(
              listingPhotos(sell.draftRef.current).map((_, index) => ({
                photos: [index],
                label: "",
              })),
              true,
            )
          }
          onNotesDone={sell.analysis.flushNote}
          onPublish={sell.publish}
          batch={sell.batch}
          onSellSeveral={sell.inBatch ? undefined : sell.sellSeveral}
        />
      </LazyBoundary>
      {footnote}
    </>
  );
}

/** Several items at once: Pako sorts the photos into one listing each. */
export function BatchSellPage({
  sell,
  pako,
  location,
  footnote,
  onAccount,
}: {
  sell: SellSession;
  pako: PakoStatus;
  location: string;
  footnote: ReactNode;
  onAccount: () => void;
}) {
  return (
    <>
      <LazyBoundary label="Loading selling">
        <BatchSellFlow
          location={location}
          liveAgent={pako.configured}
          quota={pako.quota}
          onAccount={onAccount}
          start={sell.batchStart}
          onBack={sell.leaveBatch}
          onStart={sell.startBatchListings}
        />
      </LazyBoundary>
      {footnote}
    </>
  );
}
