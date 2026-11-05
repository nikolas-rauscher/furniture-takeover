import {
  ArrowRight,
  Bell,
  BellOff,
  Bookmark,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { searchText, type SavedSearch } from "../searchRequest";

type SavedSearchesPageProps = {
  searches: SavedSearch[];
  location: string;
  onRun(job: SavedSearch): void;
  onEdit(job: SavedSearch): void;
  onDelete(job: SavedSearch): void;
  onTogglePause(job: SavedSearch): void;
  onFind(): void;
  onWatch(query: string, maxPrice?: number): void;
  alerts?: ReactNode;
};

export default function SavedSearchesPage({
  searches,
  location,
  onRun,
  onEdit,
  onDelete,
  onTogglePause,
  onFind,
  onWatch,
  alerts,
}: SavedSearchesPageProps) {
  const [wantedQuery, setWantedQuery] = useState("");
  const [wantedPrice, setWantedPrice] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const query = wantedQuery.trim();
    if (!query) return;
    onWatch(query, wantedPrice.trim() === "" ? undefined : Number(wantedPrice));
    setWantedQuery("");
    setWantedPrice("");
  }
  return (
    <>
      <div className="page-title">
        <h1>Saved searches</h1>
        <p>
          Keep a search and get an alert when a new matching listing appears.
        </p>
      </div>
      {alerts}
      <form
        className="watch-form"
        onSubmit={submit}
        aria-label="Watch for an item"
      >
        <label className="grow">
          Watch for an item
          <input
            value={wantedQuery}
            maxLength={120}
            placeholder="e.g. desk"
            onChange={(event) => setWantedQuery(event.target.value)}
          />
        </label>
        <label>
          Max price (CHF)
          <input
            type="number"
            min={0}
            max={1000000}
            value={wantedPrice}
            placeholder="Any"
            onChange={(event) => setWantedPrice(event.target.value)}
          />
        </label>
        <button
          className="button primary small"
          type="submit"
          disabled={!wantedQuery.trim()}
        >
          <Bell size={14} />
          Notify me
        </button>
      </form>
      {searches.length ? (
        <div className="search-jobs">
          {searches.map((job) => (
            <article className="search-job" key={job.id}>
              <div className="job-icon">
                <Search size={20} />
              </div>
              <div className="job-main">
                <h2>{job.title}</h2>
                <p>
                  {job.request ||
                    searchText(job.criteria, job.location || location)}
                </p>
                <div className="job-actions">
                  <button
                    className="button secondary small"
                    onClick={() => onRun(job)}
                  >
                    Run search
                    <ArrowRight size={14} />
                  </button>
                  <button
                    className="button secondary small"
                    aria-pressed={job.paused}
                    onClick={() => onTogglePause(job)}
                  >
                    {job.paused ? <BellOff size={14} /> : <Bell size={14} />}
                    {job.paused ? "Alerts paused" : "Alerts on"}
                  </button>
                </div>
              </div>
              <div className="job-controls">
                <button
                  className="icon-button"
                  aria-label={"Edit saved search " + job.title}
                  onClick={() => onEdit(job)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Delete saved search " + job.title}
                  onClick={() => onDelete(job)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Bookmark size={32} />
          <h2>No saved searches yet</h2>
          <p>Start with what you need, then save your search.</p>
          <button className="button primary" onClick={onFind}>
            Find furniture
          </button>
        </div>
      )}
      {searches.length > 0 && (
        <p className="quiet-caption">
          Stored in this browser. Alerts cover listings in this browser and the
          demo catalog; nothing is sent to a seller.
        </p>
      )}
    </>
  );
}
