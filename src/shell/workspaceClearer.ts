import { defaults } from "../../shared/marketplace";
import type { Comparison } from "../hooks/useComparison";
import type { useMessagesInbox } from "../hooks/useMessagesInbox";
import type { MyListings } from "../hooks/useMyListings";
import type { SavedItems } from "../hooks/useSavedItems";
import type { SavedSearches } from "../hooks/useSavedSearches";
import type { SearchSession } from "../hooks/useSearchSession";
import type { Toasts } from "../hooks/useToast";

type SearchArea = { location: string; radius: number };

/**
 * Clears this browser's workspace: first the demo's conversations and deals,
 * so the sample listings can get back the statuses those deals changed, then
 * the student's listings and choices.
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
    try {
      await parts.messages.reset?.();
    } catch (failure) {
      parts.toast.say(
        failure instanceof Error
          ? failure.message
          : "Couldn't clear browser data. Try again.",
      );
      return;
    }
    if (!(await parts.catalog.clear())) {
      parts.toast.say("Couldn't clear browser data. Try again.");
      return;
    }
    parts.savedItems.clear();
    parts.savedSearches.clear();
    parts.compare.clear();
    parts.setSearchArea({ location: "Lausanne", radius: defaults.radius });
    parts.goHome();
    parts.search.setCriteria({ ...defaults });
    parts.toast.say("Browser data cleared.");
  };
}
