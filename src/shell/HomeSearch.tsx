import type { ReactNode } from "react";
import { ArrowRight, Camera, ChevronDown, MapPin } from "@/components/icons";
import PhotoSearchButton, { imageFrom } from "../components/PhotoSearchButton";
import AgentSuggestions from "../components/AgentSuggestions";
import type { useAgentAssist } from "../hooks/useAgentAssist";
import { shortPlace } from "../searchSummary";
import type { homeGuide } from "../pakoMoods";
import { PageTransitionShared } from "../components/animate-ui/components/page-transition";
import PakoReaction from "../components/PakoReaction";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import type { PakoStatus } from "../hooks/usePakoStatus";
import type { SearchSession } from "../hooks/useSearchSession";

type Actions = {
  onSearch: (text: string) => void;
  onOpenArea: () => void;
  onSeeMatches: () => void;
  onSell: () => void;
};

/** Home's search: Pako's greeting, the search box with area and photo search, and the way to sell. */
export default function HomeSearch({
  search,
  pako,
  guide,
  suggestions,
  location,
  footnote,
  actions,
}: {
  search: SearchSession;
  pako: PakoStatus;
  guide: ReturnType<typeof homeGuide>;
  suggestions: ReturnType<typeof useAgentAssist>;
  location: string;
  /** Pako's status under the search box. */
  footnote: ReactNode;
  actions: Actions;
}) {
  const { photo } = search;
  const hasDraft = search.query.trim().length > 0;
  return (
    <section
      className={`agent-hero search-entry${hasDraft ? " has-query" : ""}`}
      aria-labelledby="agent-title"
    >
      <h1 id="agent-title">What are you looking for?</h1>
      <div className="agent-hero-guide">
        <PakoReaction className="agent-hero-pako" mood={guide.mood} size={64} />
        <p className="ob-bubble agent-hero-bubble">
          {guide.line}
          {guide.newMatches && (
            <>
              {" "}
              <Button
                className="agent-hero-matches"
                onClick={actions.onSeeMatches}
              >
                See new matches
              </Button>
            </>
          )}
        </p>
      </div>
      <PageTransitionShared name="agent-composer">
        <form
          className="agent-search"
          onSubmit={(event) => {
            event.preventDefault();
            actions.onSearch(search.query);
          }}
          data-dragging={photo.dragging || undefined}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            photo.setDragging(true);
          }}
          onDragLeave={(event) => {
            const next = event.relatedTarget;
            if (!(next instanceof Node && event.currentTarget.contains(next)))
              photo.setDragging(false);
          }}
          onDrop={(event) => {
            photo.setDragging(false);
            const file = imageFrom(event.dataTransfer);
            if (!file) return;
            event.preventDefault();
            void search.searchByPhoto(file);
          }}
        >
          <PageTransitionShared name="agent-query">
            <Textarea
              ref={search.field}
              onPaste={(event) => {
                const file = imageFrom(event.clipboardData);
                if (!file) return;
                event.preventDefault();
                void search.searchByPhoto(file);
              }}
              aria-label="Search second-hand listings"
              maxLength={4000}
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
              rows={1}
              placeholder="e.g. a desk under CHF 80 near EPFL"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  actions.onSearch(search.query);
                }
              }}
            />
          </PageTransitionShared>
          <div className="agent-search-actions">
            <Button
              type="button"
              className="search-area"
              aria-label={`Search area: ${location}`}
              onClick={actions.onOpenArea}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>{shortPlace(location)}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </Button>
            <PhotoSearchButton
              busy={photo.busy}
              disabled={
                search.running || !pako.configured || pako.quotaExhausted
              }
              onFile={(file) => void search.searchByPhoto(file)}
              onKeyboardFocus={photo.setHint}
            />
            <Button
              animateIcon
              className="button primary"
              type="submit"
              disabled={
                !search.query.trim() ||
                search.running ||
                photo.busy ||
                pako.quotaExhausted
              }
            >
              Search
            </Button>
          </div>
        </form>
      </PageTransitionShared>
      <p className="sr-only" aria-live="polite">
        {photo.busy
          ? "Pako is looking at your photo."
          : photo.notice?.kind === "clarification"
            ? photo.notice.line
            : ""}
      </p>
      {photo.notice?.kind === "error" && (
        <p className="sr-only" role="alert">
          {photo.notice.line}
        </p>
      )}
      {footnote}
      <AgentSuggestions
        state={suggestions}
        onSelect={(suggestion) => {
          search.setQuery(suggestion);
          actions.onSearch(suggestion);
        }}
      />
      <div className="home-sell-card">
        <span className="home-sell-icon" aria-hidden="true">
          <Camera size={18} />
        </span>
        <p>
          <strong>Moving out?</strong>{" "}
          <span>
            Start with a photo. Pako drafts your listing for you to review.
          </span>
        </p>
        <Button animateIcon className="button quiet" onClick={actions.onSell}>
          Sell from a photo
          <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}
