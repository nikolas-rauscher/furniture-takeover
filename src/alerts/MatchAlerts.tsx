import { cardImageFor } from "../../shared/listingPhotos";
import { useId } from "react";
import { Image as ImageIcon, X } from "@/components/icons";
import { Button } from "../components/ui/button";
import PakoReaction from "../components/PakoReaction";
import { matchFacts } from "./matching";
import type { WatchMatch } from "./useWatches";
import "./match-alerts.css";

type MatchAlertsProps = {
  matches: WatchMatch[];
  onOpen(match: WatchMatch): void;
  onDismiss(match: WatchMatch): void;
  onMarkAllSeen(): void;
};

/** New listings that started matching a saved search; opening one never contacts a seller. */
export default function MatchAlerts({
  matches,
  onOpen,
  onDismiss,
  onMarkAllSeen,
}: MatchAlertsProps) {
  const headingId = useId();
  const unread = matches.filter(({ alert }) => !alert.read).length;
  return (
    <section className="match-alerts" aria-labelledby={headingId}>
      <div className="match-alerts-heading">
        <PakoReaction mood={unread ? "happy" : "idle"} size={40} />
        <h2 id={headingId}>
          New matches
          {unread > 0 && (
            <span className="match-alerts-count">
              {unread}
              <span className="sr-only"> new</span>
            </span>
          )}
        </h2>
        {unread > 0 && (
          <Button
            className="button quiet small match-alerts-seen"
            onClick={onMarkAllSeen}
          >
            Mark all as seen
          </Button>
        )}
      </div>
      <ul className="match-alert-list">
        {matches.map((match) => (
          <MatchCard
            key={match.alert.id}
            match={match}
            onOpen={() => onOpen(match)}
            onDismiss={() => onDismiss(match)}
          />
        ))}
      </ul>
    </section>
  );
}

function MatchCard({
  match: { alert, listing, search },
  onOpen,
  onDismiss,
}: {
  match: WatchMatch;
  onOpen(): void;
  onDismiss(): void;
}) {
  return (
    <li
      className="match-alert linked-card"
      data-unseen={!alert.read || undefined}
    >
      <span className="match-alert-photo">
        {listing.image ? (
          <img
            src={cardImageFor(listing)}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <ImageIcon size={20} aria-hidden="true" />
        )}
      </span>
      <div className="match-alert-text">
        <Button
          className="text-button card-link match-alert-title"
          onClick={onOpen}
        >
          {listing.title}
          {!alert.read && <span className="sr-only"> new</span>}
        </Button>
        <ul className="match-alert-facts" aria-label="Why it matches">
          {matchFacts(listing, search.criteria).map((fact) => (
            <li key={fact} className="chip">
              {fact}
            </li>
          ))}
        </ul>
        <small>From “{search.title}”</small>
      </div>
      <Button
        className="icon-button match-alert-dismiss"
        aria-label={`Dismiss match ${listing.title}`}
        onClick={onDismiss}
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </li>
  );
}
