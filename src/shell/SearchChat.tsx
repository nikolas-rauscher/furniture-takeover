import { SquarePen, X } from "@/components/icons";
import WorkspaceHeader from "../components/WorkspaceHeader";
import { MessageDraftPreview } from "../components/NegotiationSummary";
import ProposalCard, { type OfferCards } from "./ProposalCard";
import AgentConversation, {
  focusConversation,
} from "../components/AgentConversation";
import AgentListings, {
  canOffer,
  type ResultOrder,
} from "../components/AgentListings";
import AgentComposer from "../components/AgentComposer";
import AgentQuickReplies from "../components/AgentQuickReplies";
import { quickReplies, type TappableReply } from "../quickReplies";
import type { ReactNode } from "react";
import AgentRunPanel from "../components/AgentRunPanel";
import type { AgentRunState, useAgentRun } from "../hooks/useAgentRun";
import { turnAnnouncement } from "../pakoMoods";
import { TODAY, type Product } from "../../shared/marketplace";
import { PageTransitionShared } from "../components/animate-ui/components/page-transition";
import { placeName } from "../components/onboarding/onboardingContent";
import { Button } from "../components/ui/button";
import type { useWatches } from "../alerts/useWatches";
import type { useNegotiations } from "../hooks/useNegotiations";
import type { PakoStatus } from "../hooks/usePakoStatus";
import type { SearchSession } from "../hooks/useSearchSession";
import { SEARCH_HEADING } from "../navigation";
import { refilterCatalog } from "../searchRequest";
import { activePreferences, compactPreferences } from "../searchSummary";
/** Results wait while Pako works and are ranked once his turn has finished. */
function resultOrder(status: AgentRunState["status"]): ResultOrder {
  if (status === "running") return "pending";
  return status === "complete" ? "ranked" : "unranked";
}

type Comparison = {
  items: Product[];
  onCompare: () => void;
  onClear: () => void;
};

type Actions = {
  onNewSearch: () => void;
  onAccount: () => void;
  onOpenFilters: () => void;
  onSave: () => void;
  onOpenListing: (item: Product) => void;
  onOffer: (item: Product) => void;
  /** Shows exactly these listings side by side. */
  onCompare: (listingIds: string[]) => void;
  onOpenSearches: () => void;
  onReset: () => void;
};

/** The conversation with Pako about a search: his turns, the listings he found, and the composer. */
export default function SearchChat({
  search,
  agentRun,
  negotiations,
  pako,
  listings,
  watches,
  comparison,
  footnote,
  offers,
  actions,
}: {
  search: SearchSession;
  agentRun: ReturnType<typeof useAgentRun>;
  negotiations: ReturnType<typeof useNegotiations>;
  pako: PakoStatus;
  /** Listings Pako's matches can show, and every listing for their titles. */
  listings: { active: Product[]; own: Product[] };
  watches: ReturnType<typeof useWatches>;
  comparison: Comparison;
  /** Pako's status above the composer. */
  footnote: ReactNode;
  offers: OfferCards;
  actions: Actions;
}) {
  const committed = search.committedSearch;
  const reviewing = committed?.intent === "listing_review";
  /** The search area as Pako names it while he searches. */
  const place = committed ? placeName(committed.location) : undefined;
  const preferences = {
    compact: compactPreferences(committed?.criteria ?? search.criteria),
    active: committed && !reviewing ? activePreferences(committed) : "",
  };
  /** A tapped quick reply takes the same path as typing it or using the listing's own button. */
  function chooseQuickReply(reply: TappableReply, shown: Product[]) {
    if (reply.kind === "ask")
      void search.runSearch(reply.text, search.criteria, true);
    else if (reply.kind === "compare") actions.onCompare(reply.listingIds);
    else if (reply.kind === "watch") watches.watch(reply);
    else if (reply.kind === "searches") actions.onOpenSearches();
    else {
      const item = shown.find((listing) => listing.id === reply.listingId);
      if (!item)
        throw new Error("The offer reply names a listing Pako did not show.");
      actions.onOffer(item);
    }
  }
  return (
    <>
      <WorkspaceHeader
        title={reviewing ? "Listing review" : SEARCH_HEADING}
        backLabel="New search"
        backIcon={<SquarePen size={20} aria-hidden="true" />}
        onBack={actions.onNewSearch}
        onAccount={actions.onAccount}
        quota={pako.quota}
        preferences={
          !reviewing
            ? {
                summary: preferences.active,
                compactSummary: preferences.compact,
                onOpen: actions.onOpenFilters,
              }
            : undefined
        }
        save={
          !reviewing
            ? {
                disabled: search.running || !committed,
                onSave: actions.onSave,
              }
            : undefined
        }
      />
      {negotiations.error && <p role="alert">{negotiations.error}</p>}
      <AgentConversation
        state={agentRun.state}
        startPhoto={search.photo.active?.image}
        announcement={turnAnnouncement(agentRun.state, place)}
        requestTransitionName="agent-query"
        typing={search.followUp.trim() !== ""}
        context={
          negotiations.active &&
          !search.activeDraftInChat && (
            <ProposalCard
              key={negotiations.active.id}
              proposal={negotiations.active}
              compact
              offers={offers}
            />
          )
        }
        footer={
          <>
            {comparison.items.length > 0 && (
              <div
                className="chat-comparison"
                role="group"
                aria-label="Listing comparison"
              >
                <span role="status">
                  {comparison.items.length < 2
                    ? "Choose one more"
                    : `${comparison.items.length} selected`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={comparison.items.length < 2}
                  onClick={comparison.onCompare}
                >
                  Compare
                  {comparison.items.length > 1
                    ? ` ${comparison.items.length}`
                    : ""}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear comparison"
                  onClick={(event) => {
                    focusConversation(event.currentTarget);
                    comparison.onClear();
                  }}
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              </div>
            )}
            <div className="composer-status">{footnote}</div>
            <PageTransitionShared name="agent-composer">
              <AgentComposer
                value={search.followUp}
                onChange={search.setFollowUp}
                onSend={() =>
                  void search.runSearch(search.followUp, search.criteria, true)
                }
                label="Ask Pako"
                placeholder={
                  reviewing
                    ? "Ask about your listing…"
                    : search.awaitingAnswer
                      ? "Or type your answer…"
                      : "Ask a follow-up…"
                }
                sendLabel="Send to Pako"
                disabled={search.running || pako.quotaExhausted}
                onStop={search.running ? agentRun.cancel : undefined}
              />
            </PageTransitionShared>
          </>
        }
      >
        {(turn, archived) => {
          const ranked = (turn.inventoryMatchIds ?? []).flatMap((id) => {
            const item = listings.active.find((listing) => listing.id === id);
            return item ? [item] : [];
          });
          const locallyFiltered =
            !archived && Boolean(search.localPreferences) && committed;
          const localMatches = locallyFiltered
            ? refilterCatalog(listings.active, ranked, committed.criteria)
            : ranked;
          const nextReplies = quickReplies({
            turn,
            latest: !archived,
            search: committed,
            negotiating: Boolean(negotiations.active),
            watching:
              turn.watchSuggestion !== undefined &&
              committed !== null &&
              watches.isWatching({
                ...turn.watchSuggestion,
                radius: committed.criteria.radius,
              }),
            listings: localMatches.map((item) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              offerable: canOffer(item),
            })),
            today: TODAY,
          });
          return (
            <AgentRunPanel
              state={turn}
              externalComposer
              readOnly={archived}
              typing={search.followUp.trim() !== ""}
              place={place}
              quickReplies={
                nextReplies.replies.length > 0 && (
                  <AgentQuickReplies
                    {...nextReplies}
                    pausedReason={pako.allowancePause}
                    onSelect={(reply) => chooseQuickReply(reply, localMatches)}
                  />
                )
              }
              outcome={
                turn.proposal?.draft && (
                  <MessageDraftPreview
                    proposal={turn.proposal}
                    sent={negotiations.items.some(
                      (proposal) =>
                        proposal.id === turn.proposal?.id &&
                        proposal.status === "sent",
                    )}
                    title={
                      listings.own.find(
                        (item) => item.id === turn.proposal?.listingId,
                      )?.title ?? "Listing"
                    }
                    onReview={
                      negotiations.items.some(
                        (proposal) =>
                          proposal.id === turn.proposal?.id &&
                          proposal.version === turn.proposal.version &&
                          proposal.status === "draft",
                      ) &&
                      listings.own.some(
                        (item) =>
                          item.id === turn.proposal?.listingId &&
                          item.status === "active",
                      )
                        ? () =>
                            offers.review(
                              turn.proposal!,
                              listings.own.find(
                                (item) => item.id === turn.proposal?.listingId,
                              ),
                            )
                        : undefined
                    }
                  />
                )
              }
              className={`${reviewing ? "" : "search-agent-message"} ${archived ? "archived-agent-response" : ""}`}
              showHistory={false}
              splitSearchResults={
                !reviewing && (archived || !negotiations.active)
              }
              localListings={
                !reviewing &&
                ((turn.inventoryMatchIds !== null && localMatches.length > 0) ||
                  locallyFiltered) ? (
                  <>
                    {locallyFiltered && (
                      <div className="agent-run-changes">
                        <p role="status">
                          {search.localPreferences} {localMatches.length}{" "}
                          takeover{" "}
                          {localMatches.length === 1 ? "match" : "matches"}.
                        </p>
                        <details>
                          <summary>Why?</summary>
                          <p>
                            Your new preferences were applied to the takeover
                            catalog. Earlier web links and Pako's reply are from
                            the original search.
                          </p>
                        </details>
                      </div>
                    )}
                    {localMatches.length > 0 && (
                      <AgentListings
                        listings={localMatches}
                        order={resultOrder(turn.status)}
                        onOpen={actions.onOpenListing}
                        onOffer={actions.onOffer}
                      />
                    )}
                  </>
                ) : undefined
              }
              onCancel={agentRun.cancel}
              onRetry={search.retry}
              onReset={actions.onReset}
              onAnswer={search.answerQuestion}
              onSkipQuestion={(id) =>
                search.answerQuestion(
                  id,
                  "Skip this question and continue with my current preferences.",
                )
              }
              onApplyAction={(id) => {
                const action = agentRun.state.actions.find(
                  (item) => item.id === id,
                );
                if (action?.type === "preferences_patch")
                  search.applyPatch(action);
              }}
              onUndoAction={search.undoPatch}
              appliedActionIds={Object.keys(search.changes)}
              undoneActionIds={search.undone}
              actionNotices={search.notices}
            />
          );
        }}
      </AgentConversation>
    </>
  );
}
