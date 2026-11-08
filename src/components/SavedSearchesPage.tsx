import { Button } from "./ui/button";
import { ArrowRight, Bookmark, Pencil, Search, Trash2 } from "@/components/icons";
import { searchText, type SavedSearch } from "../searchRequest";

type SavedSearchesPageProps = {
  searches: SavedSearch[];
  location: string;
  onRun(job: SavedSearch): void;
  onEdit(job: SavedSearch): void;
  onDelete(job: SavedSearch): void;
  onFind(): void;
};

export default function SavedSearchesPage({
  searches,
  location,
  onRun,
  onEdit,
  onDelete,
  onFind,
}: SavedSearchesPageProps) {
  return (
    <>
      <div className="page-title">
        <h1>Saved searches</h1>
        <p>Keep a search and run it again when you need it.</p>
      </div>
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
                  <Button
                    className="button secondary small"
                    onClick={() => onRun(job)}
                  >
                    Run search
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
              <div className="job-controls">
                <Button
                  className="icon-button"
                  aria-label={"Edit saved search " + job.title}
                  onClick={() => onEdit(job)}
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  className="icon-button"
                  aria-label={"Delete saved search " + job.title}
                  onClick={() => onDelete(job)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Bookmark size={32} />
          <h2>No saved searches yet</h2>
          <p>Start with what you need, then save your search.</p>
          <Button animateIcon className="button primary" onClick={onFind}>
            Find furniture
          </Button>
        </div>
      )}
      {searches.length > 0 && (
        <p className="quiet-caption">
          Stored in this browser. Searches run when you start them.
        </p>
      )}
    </>
  );
}
