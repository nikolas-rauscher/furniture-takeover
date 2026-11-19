import { listingPhotos } from "../../shared/listingPhotos";
import { missingDetails } from "../batchListings";
import {
  startingListingTurn,
  type useListingConversation,
} from "../hooks/useListingConversation";
import {
  asksPrice,
  closingLine,
  priceSuggestion,
  trayPhase,
} from "../listingQuestions";
import { listingAnnouncement } from "../pakoMoods";
import AgentComposer from "./AgentComposer";
import AgentConversation from "./AgentConversation";
import AgentRunPanel from "./AgentRunPanel";
import { plainAnswer } from "./agentAnswer";
import ListingTray from "./ListingTray";
import PhotoBubble from "./PhotoBubble";
import type { ListingDraft } from "./SellFlow";

type Props = {
  listing: ReturnType<typeof useListingConversation>;
  draft: ListingDraft;
  /** Pako still reads the photos, before his first run of the listing starts. */
  starting: boolean;
  /** An existing listing, whose conversation does not start from its photos. */
  editing: boolean;
  /** The save button's words, which Pako's closing line names. */
  saveAction: string;
  /** Pako can be reached; without him the composer rests. */
  configured: boolean;
};

/**
 * The conversation about one listing: the student's photos and words, Pako's
 * answers and the changes he made, with his tray above the composer for the
 * question he asks now.
 */
export default function ListingConversation({
  listing,
  draft,
  starting,
  editing,
  saveAction,
  configured,
}: Props) {
  const turn = starting ? startingListingTurn : listing.state;
  const question = listing.activeQuestion;
  const queue = listing.state.questions;
  const phase = trayPhase({
    starting,
    status: listing.state.status,
    asking: question !== undefined,
  });
  const closing = closingLine(missingDetails(draft), saveAction);
  const announcement = listingAnnouncement(turn, {
    phase,
    question: question && {
      text: plainAnswer(question.question),
      first: queue[0]?.id === question.id,
    },
    closing: `${closing.title} ${closing.text}`,
  });
  return (
    <section className="listing-conversation" aria-label="Listing agent">
      <AgentConversation
        state={turn}
        announcement={announcement}
        typing={listing.input.trim() !== ""}
        footer={
          <>
            <ListingTray
              phase={phase}
              turn={turn}
              question={question}
              queue={queue}
              suggestion={
                question && asksPrice(question)
                  ? priceSuggestion(listing.state.actions)
                  : undefined
              }
              closing={closing}
              tapError={
                question && listing.tapError?.questionId === question.id
                  ? listing.tapError.message
                  : undefined
              }
              focusRequest={listing.priceReviews}
              onChoose={listing.choose}
              onPrice={listing.choosePrice}
              onSkip={listing.skip}
              onLater={listing.decideLater}
              onRetry={listing.retry}
            />
            <AgentComposer
              value={listing.input}
              onChange={listing.setInput}
              onSend={() => void listing.send(listing.input)}
              label="Tell Pako about your listing"
              placeholder={question ? "Or type your answer…" : "Add a detail…"}
              sendLabel="Send to Pako"
              disabled={!configured || listing.running}
              onStop={listing.running ? listing.cancel : undefined}
            />
          </>
        }
        renderRequest={(request, index) =>
          index === 0 && !editing ? (
            <PhotoBubble photos={listingPhotos(draft)} note={draft.raw} />
          ) : (
            <p>{request.request}</p>
          )
        }
      >
        {(shown, archived) => (
          <AgentRunPanel
            className={archived ? "archived-agent-response" : ""}
            conversational
            externalComposer
            questionsInTray
            readOnly={archived}
            voice="listing"
            typing={listing.input.trim() !== ""}
            showHistory={false}
            state={shown}
            onCancel={listing.cancel}
            onReset={listing.resetConversation}
            onRetry={listing.retry}
            onApplyAction={listing.accept}
            onUndoAction={listing.undo}
            onUndoAnswer={listing.undoAnswer}
            appliedActionIds={listing.appliedIds}
            undoneActionIds={listing.undoneIds}
            actionNotices={listing.notices}
          />
        )}
      </AgentConversation>
    </section>
  );
}
