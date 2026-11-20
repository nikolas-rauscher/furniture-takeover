import type { Product } from "../../shared/marketplace";
import SavedSearchesPage from "../components/SavedSearchesPage";
import type { SavedSearches } from "../hooks/useSavedSearches";
import type { SavedSearch } from "../searchRequest";

/** Saved searches with their new matches, and a quick way to keep a new one. */
export default function SavedSearchesScreen({
  savedSearches,
  location,
  radius,
  loaded,
  onOpenListing,
  onFind,
  onRun,
  onEdit,
}: {
  savedSearches: SavedSearches;
  location: string;
  /** The search area's distance, which a new saved search keeps. */
  radius: number;
  loaded: boolean;
  onOpenListing: (item: Product) => void;
  onFind: () => void;
  onRun: (job: SavedSearch) => void;
  onEdit: (job: SavedSearch) => void;
}) {
  const { watches } = savedSearches;
  return (
    <SavedSearchesPage
      loaded={loaded}
      searches={savedSearches.saved}
      location={location}
      matches={watches.matches}
      onOpenMatch={({ alert, listing }) => {
        watches.markRead(alert.id);
        onOpenListing(listing);
      }}
      onDismissMatch={({ alert }) => watches.dismiss(alert.id)}
      onMarkAllSeen={watches.markAllRead}
      onTogglePause={watches.togglePause}
      onWatch={(query, maxPrice) =>
        savedSearches.keepWatch({ query, maxPrice, radius })
      }
      onFind={onFind}
      onRun={onRun}
      onEdit={onEdit}
      onDelete={savedSearches.remove}
    />
  );
}
