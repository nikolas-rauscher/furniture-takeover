import {
  destinationDirection,
  destinationFor,
  type Destination,
} from "../navigation";
import { transitionPage } from "../pageTransition";
import type { AppNavigation } from "./useAppNavigation";
import type { SearchSession } from "./useSearchSession";
import type { SellSession } from "./useSellSession";
import type { ThreadRequests } from "./useThreadRequests";

/** The app's main ways around: its destinations, home, a new search and selling. */
export function useDestinations({
  nav,
  sell,
  search,
  threads,
  signedIn,
  sellFrom,
  onHome,
}: {
  nav: AppNavigation;
  sell: SellSession;
  search: SearchSession;
  threads: ThreadRequests;
  signedIn: boolean;
  /** Where a new listing is picked up unless the seller changes it. */
  sellFrom: string;
  /** Home opens again from the top. */
  onHome: () => void;
}) {
  const { navigate } = nav;
  const current = destinationFor(nav.view, nav.accountTab);
  function goHome() {
    onHome();
    navigate("discover");
    search.reset();
  }
  function startSell() {
    sell.startAt(sellFrom);
  }
  function openSell() {
    if (sell.hasDraft()) navigate("sell");
    else startSell();
  }
  function openBrowse() {
    navigate("discover");
  }
  return {
    current,
    goHome,
    startSell,
    openBrowse,
    open(destination: Destination) {
      transitionPage(destinationDirection(current, destination), () => {
        if (destination === "browse") openBrowse();
        else if (destination === "sell") openSell();
        else if (destination === "messages") threads.open();
        else if (destination === "searches") navigate("searches");
        else if (destination === "settings") navigate("settings");
        else {
          nav.setAccountTab(
            destination === "favorites" ? "favorites" : "listings",
          );
          navigate("account");
          if (destination === "favorites" && signedIn)
            nav.replaceRoute("#saved");
        }
      });
    },
    /** Clears the chat and leaves the search box ready for the next request. */
    startNewSearch() {
      search.focusOnNextHome();
      transitionPage("nav-back", goHome, "fade");
    },
    /** Entering the chat crossfades the page while the search box becomes the composer. */
    startSearchFromHome(text: string) {
      transitionPage("nav-forward", () => void search.runSearch(text), "fade");
    },
  };
}
