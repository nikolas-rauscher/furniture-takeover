import type { useListingConversation } from "../hooks/useListingConversation";
import AgentComposer from "./AgentComposer";

/** Where the student types to Pako about the listing: an answer to his question, or a detail. */
export default function ListingComposer({
  listing,
  configured,
}: {
  listing: ReturnType<typeof useListingConversation>;
  /** Pako can be reached; without him the composer rests. */
  configured: boolean;
}) {
  return (
    <AgentComposer
      value={listing.input}
      onChange={listing.setInput}
      onSend={() => void listing.send(listing.input)}
      label="Tell Pako about your listing"
      placeholder={
        listing.activeQuestion ? "Or type your answer…" : "Add a detail…"
      }
      sendLabel="Send to Pako"
      disabled={!configured || listing.running}
      onStop={listing.running ? listing.cancel : undefined}
    />
  );
}
