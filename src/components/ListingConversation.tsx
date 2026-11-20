import { missingDetails } from "../batchListings";
import type { AgentRunTurn } from "../hooks/useAgentRun";
import {
  LISTING_START,
  startingListingTurn,
  type useListingConversation,
} from "../hooks/useListingConversation";
import {
  asksPrice,
  closingLine,
  listingPhase,
  PICKUP_QUESTION,
  priceSuggestion,
  restingLine,
  type ListingPhase,
} from "../listingQuestions";
import { listingAnnouncement } from "../pakoMoods";
import { POLISH_DESCRIPTION } from "./AskPakoMenu";
import { plainAnswer, shownAnswerText } from "./agentAnswer";
import ListingNotes from "./ListingNotes";
import ListingPako from "./ListingPako";
import type { ListingDraft } from "../listingDraft";

type Props = {
  listing: Pick<
    ReturnType<typeof useListingConversation>,
    | "state"
    | "running"
    | "queue"
    | "activeQuestion"
    | "answeredBefore"
    | "askingOwnQuestion"
    | "tapError"
    | "priceReviews"
    | "send"
    | "retry"
    | "resetConversation"
    | "choose"
    | "choosePrice"
    | "choosePickupDate"
    | "skip"
    | "decideLater"
  >;
  draft: ListingDraft;
  /** Pako still reads the photos, before his first run of the listing starts. */
  starting: boolean;
  /** The save button's words, which Pako's closing line names. */
  saveAction: string;
  /** Pako can be reached; without him the composer rests. */
  configured: boolean;
  /** The day's allowance is used up. */
  asleep: boolean;
  /** The student goes on without Pako and fills in the details. */
  onManual: () => void;
};

/** The student's own words to Pako; the listing's first turn starts from its photos instead. */
function StudentWords({ turn }: { turn: AgentRunTurn }) {
  if (turn.request === LISTING_START) return null;
  return (
    <p className="listing-student-words">
      <span className="sr-only">You: </span>
      {turn.request}
    </p>
  );
}

/**
 * Whether Pako's bubble says his answer: with the first question his run asks, or
 * with his closing line when he asked nothing. Otherwise his notes keep it.
 */
function answerInBubble(
  phase: ListingPhase,
  turn: AgentRunTurn,
  firstQuestion: boolean,
) {
  if (phase === "asking") return firstQuestion;
  return phase === "done" && turn.questions.length === 0;
}

/**
 * The conversation about one listing, in the listing column: earlier turns as a
 * quiet record, then the student's latest words, Pako once with his current line,
 * and what this turn changed.
 */
export default function ListingConversation({
  listing,
  draft,
  starting,
  saveAction,
  configured,
  asleep,
  onManual,
}: Props) {
  const turn = starting ? startingListingTurn : listing.state;
  const question = listing.activeQuestion;
  const queue = listing.queue;
  const fromRun = queue.filter((item) => item.id !== PICKUP_QUESTION.id);
  const firstQuestion = fromRun[0]?.id === question?.id;
  const phase = listingPhase({
    starting,
    status: listing.state.status,
    asking: question !== undefined,
    asleep,
  });
  const closing =
    phase === "asleep"
      ? restingLine(saveAction)
      : closingLine(missingDetails(draft), saveAction);
  const announcement = listingAnnouncement(turn, {
    phase,
    question: question && {
      text: plainAnswer(question.question),
      // His explanation is read with the first question his run asks.
      first: firstQuestion,
    },
    closing: `${closing.title} ${closing.text}`,
  });
  const answer = shownAnswerText(turn.text, turn.questions);
  const spoken = answerInBubble(phase, turn, firstQuestion);
  return (
    <section
      className="listing-conversation"
      aria-label="Listing conversation with Pako"
    >
      {/* One polite voice for the whole conversation: streamed words are not read one by one. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {turn.history.map((earlier) => (
        <div key={earlier.turnKey || earlier.id} className="listing-turn">
          <StudentWords turn={earlier} />
          <ListingNotes
            listing={listing}
            turn={earlier}
            current={false}
            reply={shownAnswerText(earlier.text, earlier.questions)}
          />
        </div>
      ))}
      {turn.id && <StudentWords turn={turn} />}
      <ListingPako
        phase={phase}
        turn={turn}
        question={question}
        queue={queue}
        answeredBefore={listing.answeredBefore}
        suggestion={
          question && asksPrice(question)
            ? priceSuggestion(listing.state.actions)
            : undefined
        }
        closing={closing}
        reply={spoken ? answer : ""}
        tapError={
          question && listing.tapError?.questionId === question.id
            ? listing.tapError.message
            : undefined
        }
        focusRequest={listing.priceReviews}
        waiting={listing.running && !listing.askingOwnQuestion}
        onPickupDate={
          listing.askingOwnQuestion ? listing.choosePickupDate : undefined
        }
        onChoose={listing.choose}
        onPrice={listing.choosePrice}
        onSkip={listing.skip}
        onLater={listing.decideLater}
        onRetry={listing.retry}
        onManual={onManual}
        onPolish={
          configured
            ? () => void listing.send(POLISH_DESCRIPTION.request, {}, true)
            : undefined
        }
      />
      {turn.id && (
        <ListingNotes
          listing={listing}
          turn={turn}
          current
          reply={spoken ? "" : answer}
          diagnostic={listing.state.diagnostic}
        />
      )}
    </section>
  );
}
