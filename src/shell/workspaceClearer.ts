import { defaults } from "../../shared/marketplace";
import { resetMessageWorkspace } from "../api/messages";
import type { Comparison } from "../hooks/useComparison";
import type { useMessagesInbox } from "../hooks/useMessagesInbox";
import type { MyListings } from "../hooks/useMyListings";
import type { SavedItems } from "../hooks/useSavedItems";
import type { SavedSearches } from "../hooks/useSavedSearches";
import type { SearchSession } from "../hooks/useSearchSession";
import type { Toasts } from "../hooks/useToast";

type SearchArea = { location: string; radius: number };

/**
 * Clears this browser's workspace: the student's listings and choices, then
 * the demo's conversations and deals, after giving the sample listings back
 * the statuses those deals changed.
 */
export function workspaceClearer(parts: {
  catalog: MyListings;
  savedItems: SavedItems;
  savedSearches: SavedSearches;
  compare: Comparison;
  search: SearchSession;
  messages: ReturnType<typeof useMessagesInbox>;
  toast: Toasts;
  setSearchArea: (area: SearchArea) => void;
  goHome: () => void;
}) {
  return async function clearWorkspace() {
    parts.catalog.clear();
    parts.savedItems.clear();
    parts.savedSearches.clear();
    parts.compare.clear();
    parts.setSearchArea({ location: "Lausanne", radius: defaults.radius });
    parts.goHome();
    parts.search.setCriteria({ ...defaults });
    resetMessageWorkspace();
    await parts.messages.demoInbox.reset();
    parts.toast.say("Browser data cleared.");
  };
}
