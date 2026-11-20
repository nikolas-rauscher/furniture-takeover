import { useState } from "react";
import { Bookmark, Camera, Search } from "@/components/icons";
import { defaults } from "../../shared/marketplace";
import Modal from "../components/Modal";
import SearchPreferencesFields from "../components/SearchPreferencesFields";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import type { SavedSearches } from "../hooks/useSavedSearches";
import type { SearchSession } from "../hooks/useSearchSession";

export type Dialog =
  "filters" | "save" | "edit-search" | "location" | "help" | "clear" | null;

type SearchArea = { location: string; radius: number };

/** The app's dialogs; only the one asked for is open. */
export default function AppDialogs({
  dialog,
  onClose,
  search,
  savedSearches,
  area,
  onArea,
  onClear,
}: {
  dialog: Dialog;
  onClose: () => void;
  search: SearchSession;
  savedSearches: SavedSearches;
  /** The search area the area dialog starts from. */
  area: SearchArea;
  onArea: (area: SearchArea) => void;
  onClear: () => void;
}) {
  switch (dialog) {
    case "filters":
      return <FiltersDialog search={search} onClose={onClose} />;
    case "save":
    case "edit-search":
      return (
        <SaveSearchDialog
          editing={dialog === "edit-search"}
          search={search}
          savedSearches={savedSearches}
          onClose={onClose}
        />
      );
    case "location":
      return <AreaDialog initial={area} onArea={onArea} onClose={onClose} />;
    case "help":
      return <HelpDialog onClose={onClose} />;
    case "clear":
      return <ClearDialog onClear={onClear} onClose={onClose} />;
    default:
      return null;
  }
}

function FiltersDialog({
  search,
  onClose,
}: {
  search: SearchSession;
  onClose: () => void;
}) {
  return (
    <Modal title="Search preferences" onClose={onClose}>
      <p className="modal-intro">Tell the agent what matters for this search.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          search.applyFilterForm();
        }}
      >
        <SearchPreferencesFields
          value={search.filterDraft}
          onChange={search.setFilterDraft}
        />
        <div className="modal-actions">
          <Button
            type="button"
            className="text-button"
            onClick={() => search.setFilterDraft({ ...defaults })}
          >
            Reset
          </Button>
          <Button
            animateIcon
            className="button primary"
            type="submit"
            disabled={search.running}
          >
            Apply preferences
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SaveSearchDialog({
  editing,
  search,
  savedSearches,
  onClose,
}: {
  editing: boolean;
  search: SearchSession;
  savedSearches: SavedSearches;
  onClose: () => void;
}) {
  return (
    <Modal
      title={editing ? "Edit search" : "Save search"}
      onClose={() => {
        onClose();
        savedSearches.stopEditing();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          savedSearches.save();
        }}
      >
        <label>
          Search name
          <Input
            required
            maxLength={90}
            pattern=".*\S.*"
            value={savedSearches.title}
            onChange={(event) => savedSearches.setTitle(event.target.value)}
          />
        </label>
        {editing ? (
          <SearchPreferencesFields
            value={search.filterDraft}
            onChange={search.setFilterDraft}
          />
        ) : (
          <p className="modal-intro">{search.committedSearch?.text}</p>
        )}
        <p className="quiet-caption">
          Saved in this browser. Run it again from Saved searches.
        </p>
        <Button animateIcon className="button primary full" type="submit">
          <Bookmark size={16} />
          Save search
        </Button>
      </form>
    </Modal>
  );
}

function AreaDialog({
  initial,
  onArea,
  onClose,
}: {
  initial: SearchArea;
  onArea: (area: SearchArea) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <Modal title="Search area" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onArea({ location: draft.location.trim(), radius: draft.radius });
        }}
      >
        <label>
          Location
          <Input
            required
            maxLength={120}
            pattern=".*\S.*"
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>
            Distance<span className="sr-only"> in kilometres</span>
          </span>
          <span className="input-with-unit">
            <Input
              required
              type="number"
              min="0"
              max="500"
              step="0.1"
              value={Number.isNaN(draft.radius) ? "" : draft.radius}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  radius: event.target.valueAsNumber,
                }))
              }
            />
            <span className="input-unit" aria-hidden="true">
              km
            </span>
          </span>
        </label>
        <Button animateIcon className="button primary full" type="submit">
          Use this area
        </Button>
      </form>
    </Modal>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How Pako helps" onClose={onClose}>
      <div className="help-list">
        <div>
          <Search size={20} />
          <p>
            <strong>Search</strong>Pako checks takeover listings and can
            search other sites. Check external prices and availability on
            the original page.
          </p>
        </div>
        <div>
          <Camera size={20} />
          <p>
            <strong>Search with a photo</strong>When you search with a
            photo, we send it to the AI service to identify the item. The
            search then uses that description.
          </p>
        </div>
        <div>
          <Camera size={20} />
          <p>
            <strong>Sell</strong>When Pako looks at your photos or drafts a
            listing, we send your photos and notes to the AI service. Check
            the details before publishing.
          </p>
        </div>
        <div>
          <Bookmark size={20} />
          <p>
            <strong>Keep</strong>Saved searches and alerts stay in this
            browser. Nothing reaches another student until you publish a
            listing or send a message.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function ClearDialog({
  onClear,
  onClose,
}: {
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Clear browser data for takeover?" onClose={onClose}>
      <p className="modal-intro">
        This clears your listings, saved items, saved searches, alerts,
        conversations and demo deals from this browser. Shared sample
        listings stay available.
      </p>
      <div className="modal-actions">
        <Button className="button secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button animateIcon className="button danger" onClick={onClear}>
          Clear browser data
        </Button>
      </div>
    </Modal>
  );
}
