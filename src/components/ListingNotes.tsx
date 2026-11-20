import type { AgentRunDiagnostic } from "../../shared/runs";
import type { AgentRunTurn } from "../hooks/useAgentRun";
import type { useListingConversation } from "../hooks/useListingConversation";
import { safeSourceUrl } from "../api/runs";
import { answerParts } from "./AgentAnswerContent";
import AgentRunDebug from "./AgentRunDebug";
import AgentRunDetails from "./AgentRunDetails";
import AgentWebResults from "./AgentWebResults";
import { Ellipsis } from "./icons";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Listing = ReturnType<typeof useListingConversation>;

/** Running the last request again or starting over, for the turn Pako is on. */
function TurnMenu({ listing, failed }: { listing: Listing; failed: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="icon-sm" className="listing-notes-more" />}
        aria-label="Pako reply options"
      >
        <Ellipsis size={18} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!failed && (
          <DropdownMenuItem onClick={listing.retry}>
            Search again
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={listing.resetConversation}>
          Clear conversation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * What one of Pako's turns left behind, under his bubble: his activity folded into
 * one line that opens to the steps and sources, and what he answered when his bubble
 * does not say it. The card above shows what he changed.
 */
export default function ListingNotes({
  listing,
  turn,
  current,
  reply,
  diagnostic,
}: {
  listing: Listing;
  turn: AgentRunTurn;
  /** The turn Pako is on, which its menu can run again or clear. */
  current: boolean;
  /** What Pako answered, when his bubble does not say it. */
  reply: string;
  diagnostic?: AgentRunDiagnostic;
}) {
  // While he works, his bubble says what he does; the record follows once the turn ends.
  if (turn.status === "running") return null;
  const steps = turn.steps ?? [];
  const sources = turn.sources.filter((source) => safeSourceUrl(source.url));
  const failed = turn.status === "error";
  const menu = current && <TurnMenu listing={listing} failed={failed} />;
  const hasActivity =
    steps.length > 0 || (turn.reasoning ?? []).some((part) => part.text);
  return (
    <div className="listing-notes">
      {hasActivity ? (
        <AgentRunDetails
          reasoning={turn.reasoning}
          steps={steps}
          voice="listing"
          sourceCount={sources.length}
          summaryTitle
          actions={menu}
        >
          <AgentWebResults
            sources={sources}
            searches={steps.filter((step) => step.task === "web")}
            running={false}
            stopped={turn.status === "idle"}
            onRetry={current && !failed ? listing.retry : undefined}
          />
        </AgentRunDetails>
      ) : (
        menu && <div className="listing-notes-menu">{menu}</div>
      )}
      {reply && (
        <p className="listing-notes-reply">{answerParts(reply, sources)}</p>
      )}
      {current && turn.status !== "idle" && (
        <AgentRunDebug diagnostic={diagnostic} />
      )}
    </div>
  );
}
