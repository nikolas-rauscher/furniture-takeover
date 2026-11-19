import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
  ArrowRight,
  Bell,
  BellOff,
  Pencil,
  Search,
  Trash2,
} from "@/components/icons";
import type { SavedSearch } from "../searchRequest";
import { money } from "../../shared/marketplace";
import Pako from "./onboarding/Pako";
import MatchAlerts from "../alerts/MatchAlerts";
import { NO_BUDGET } from "../alerts/matching";
import WatchForm from "../alerts/WatchForm";
import type { WatchMatch } from "../alerts/useWatches";
import { useMediaQuery } from "../hooks/useMediaQuery";
import "./saved-searches.css";

/** The student's own words, where the title does not repeat them. */
function searchRequest(job: SavedSearch) {
  return job.request && job.request.trim() !== job.title.trim()
    ? job.request
    : undefined;
}

/** The budget and reach of a saved search, short enough for a chip each. */
function searchLimits({ criteria }: SavedSearch, place: string) {
  return [
    criteria.maxPrice >= NO_BUDGET
      ? "Any budget"
      : criteria.maxPrice === 0
        ? "Free only"
        : `Up to ${money(criteria.maxPrice)}`,
    `${criteria.radius} km of ${place}`,
  ];
}

/** The watch card unfolds in place, like a sheet sliding up. */
const UNFOLD = { type: "spring", stiffness: 380, damping: 32 } as const;

type SavedSearchesPageProps = {
  /** Listings have loaded, so new matches are known: the page shows at once, without moving. */
  loaded: boolean;
  searches: SavedSearch[];
  location: string;
  matches: WatchMatch[];
  onOpenMatch(match: WatchMatch): void;
  onDismissMatch(match: WatchMatch): void;
  onMarkAllSeen(): void;
  onRun(job: SavedSearch): void;
  onEdit(job: SavedSearch): void;
  onDelete(job: SavedSearch): void;
  onTogglePause(job: SavedSearch): void;
  onFind(): void;
  onWatch(query: string, maxPrice?: number): void;
};

export default function SavedSearchesPage({
  loaded,
  searches,
  location,
  matches,
  onOpenMatch,
  onDismissMatch,
  onMarkAllSeen,
  onRun,
  onEdit,
  onDelete,
  onTogglePause,
  onFind,
  onWatch,
}: SavedSearchesPageProps) {
  const phone = useMediaQuery("(max-width: 760px)");
  const [watchOpen, setWatchOpen] = useState(false);
  const watchQuery = useRef<HTMLInputElement>(null);
  // Wide screens keep the watch card open beside saved searches; phones and
  // the empty page unfold it on request.
  const watchShown = watchOpen || (searches.length > 0 && !phone);
  useEffect(() => {
    if (watchOpen) watchQuery.current?.focus();
  }, [watchOpen]);
  const openWatch = () => setWatchOpen(true);
  const watchCard = (
    <AnimatePresence initial={false}>
      {watchShown && (
        <motion.div
          key="watch"
          className="watch-card-frame"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={UNFOLD}
        >
          <WatchForm queryRef={watchQuery} onWatch={onWatch} />
        </motion.div>
      )}
    </AnimatePresence>
  );
  return (
    <>
      <div className="page-title">
        <h1>Saved searches</h1>
        <p>
          Pako checks new listings for these and tells you here when one fits.
        </p>
      </div>
      {loaded && (
        <>
          {matches.length > 0 && (
            <MatchAlerts
              matches={matches}
              onOpen={onOpenMatch}
              onDismiss={onDismissMatch}
              onMarkAllSeen={onMarkAllSeen}
            />
          )}
          {searches.length ? (
            <>
              {!watchShown && (
                <Button
                  className="button secondary watch-open"
                  onClick={openWatch}
                >
                  <Bell size={16} aria-hidden="true" />
                  Watch for an item
                </Button>
              )}
              {watchCard}
              <div className="search-jobs">
                {searches.map((job) => (
                  <SearchCard
                    key={job.id}
                    job={job}
                    request={searchRequest(job)}
                    limits={searchLimits(job, job.location || location)}
                    onRun={() => onRun(job)}
                    onEdit={() => onEdit(job)}
                    onDelete={() => onDelete(job)}
                    onTogglePause={() => onTogglePause(job)}
                  />
                ))}
              </div>
              <p className="quiet-caption">
                Stored in this browser. Alerts cover listings you can see here;
                nothing is sent to sellers.
              </p>
            </>
          ) : (
            <>
              <div className="saved-searches-empty">
                <Pako mood="wave" size={80} />
                <h2>No saved searches yet</h2>
                <p>
                  Tell Pako what you need, then save the search. New matches
                  show up here.
                </p>
                <Button animateIcon className="button primary" onClick={onFind}>
                  Find furniture
                </Button>
                {!watchShown && (
                  <Button className="button quiet" onClick={openWatch}>
                    Watch for an item
                  </Button>
                )}
              </div>
              {watchCard}
            </>
          )}
        </>
      )}
    </>
  );
}

function SearchCard({
  job,
  request,
  limits,
  onRun,
  onEdit,
  onDelete,
  onTogglePause,
}: {
  job: SavedSearch;
  request?: string;
  limits: string[];
  onRun(): void;
  onEdit(): void;
  onDelete(): void;
  onTogglePause(): void;
}) {
  return (
    <article className="search-job" data-paused={job.paused || undefined}>
      <div className="job-icon">
        <Search size={20} />
      </div>
      <div className="job-main">
        <h2>{job.title}</h2>
        {request && <p>{request}</p>}
      </div>
      <div className="job-controls">
        <Button
          className="icon-button"
          aria-label={"Edit saved search " + job.title}
          onClick={onEdit}
        >
          <Pencil size={16} />
        </Button>
        <Button
          className="icon-button"
          aria-label={"Delete saved search " + job.title}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      </div>
      <ul className="job-chips" aria-label="Search limits and alerts">
        {limits.map((limit) => (
          <li key={limit} className="chip">
            {limit}
          </li>
        ))}
        <li className="chip job-alert-status">
          {job.paused ? (
            <BellOff size={14} aria-hidden="true" />
          ) : (
            <Bell size={14} aria-hidden="true" />
          )}
          {job.paused ? "Alerts paused" : "Alerts on"}
        </li>
      </ul>
      <div className="job-actions">
        <Button className="button secondary small" onClick={onRun}>
          Run search
          <ArrowRight size={14} />
        </Button>
        <label className="job-alerts">
          <Switch
            checked={!job.paused}
            aria-label={`Alerts for ${job.title}`}
            onCheckedChange={onTogglePause}
          />
          Alerts
        </label>
      </div>
    </article>
  );
}
