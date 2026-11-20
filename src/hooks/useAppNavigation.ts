import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Product } from "../../shared/marketplace";
import {
  historyPosition,
  needsSignIn,
  readRoute,
  viewHash,
  type AccountTab,
  type View,
} from "../navigation";
import { transitionPage, type PageDirection } from "../pageTransition";

type Route = ReturnType<typeof readRoute>;

export type AppNavigation = ReturnType<typeof useAppNavigation>;

/**
 * The page on screen and the tab's history: which page, which listing and
 * which account tab, kept in step with the address bar and Back and Forward.
 */
export function useAppNavigation({
  signedIn,
  onLeave,
  onNavigate,
  onHistoryRoute,
}: {
  signedIn: boolean;
  /** Runs before another page opens, while the one being left is still on screen. */
  onLeave: (from: View, to: View) => void;
  /** Runs on every navigation, also to the page already on screen. */
  onNavigate: () => void;
  /** Back or Forward led to this address; the parts outside navigation follow it. */
  onHistoryRoute: (route: Route) => void;
}) {
  const [initialRoute] = useState(() => readRoute(window.location.hash));
  const [view, setView] = useState<View>(initialRoute.view);
  const [accountTab, setAccountTab] = useState<AccountTab>(
    initialRoute.accountTab,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRoute.view === "detail" ? (initialRoute.listingId ?? null) : null,
  );
  /** Where the open listing was reached from; a listing opened by link leads back to Browse. */
  const [detailOrigin, setDetailOrigin] = useState<View>("discover");
  const comparisonOrigin = useRef<View>("discover");
  /** Where the page on screen sits in this tab's history. */
  const historyPlace = useRef(historyPosition(window.history.state));

  /** Adds a history entry one step after the current one. */
  function pushRoute(url: string) {
    historyPlace.current += 1;
    window.history.pushState({ position: historyPlace.current }, "", url);
  }
  /** Changes the current history entry's address; its place stays. */
  function replaceRoute(url: string) {
    window.history.replaceState(window.history.state, "", url);
  }
  function navigate(next: View, fromHistory = false) {
    if (!signedIn && needsSignIn(next)) {
      navigate("settings", fromHistory);
      return;
    }
    if (next !== view) onLeave(view, next);
    setView(next);
    if (!fromHistory) {
      const hash = viewHash(next);
      if (window.location.hash !== hash)
        pushRoute(window.location.pathname + window.location.search + hash);
    }
    onNavigate();
  }
  /** Shows the page Back or Forward led to, moving the way the step went. */
  const showHistoryEntry = useEffectEvent((direction: PageDirection) => {
    const route = readRoute(window.location.hash);
    transitionPage(direction, () => {
      setAccountTab(route.accountTab);
      onHistoryRoute(route);
      if (route.view === "detail") setSelectedId(route.listingId ?? null);
      navigate(route.view, true);
    });
  });
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const position = historyPosition(event.state);
      const direction =
        position < historyPlace.current ? "nav-back" : "nav-forward";
      historyPlace.current = position;
      // React renders a transition that starts during popstate at once, without
      // its page transition. Started just after the event, Back and Forward
      // move the page together with the tab highlight, like a tap does.
      setTimeout(() => showHistoryEntry(direction), 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const leaveSignedInPage = useEffectEvent(() => navigate("settings"));
  useEffect(() => {
    if (!signedIn && needsSignIn(view)) leaveSignedInPage();
  }, [signedIn, view]);

  return {
    view,
    accountTab,
    setAccountTab,
    selectedId,
    detailOrigin,
    initialRoute,
    navigate,
    pushRoute,
    replaceRoute,
    /** Search results open on Browse, as a new history entry when another page was showing. */
    showSearch() {
      setView("discover");
      if (window.location.hash)
        pushRoute(window.location.pathname + window.location.search);
    },
    openListing(item: Product) {
      if (item.status === "withdrawn") return;
      transitionPage("nav-forward", () => {
        // Similar items opened from a listing keep leading back to where you started.
        if (view !== "detail") setDetailOrigin(view);
        setSelectedId(item.id);
        navigate("detail");
      });
      replaceRoute(`#listing/${encodeURIComponent(item.id)}`);
    },
    openComparison() {
      comparisonOrigin.current = view;
      navigate("compare");
    },
    leaveComparison() {
      transitionPage("nav-back", () => navigate(comparisonOrigin.current));
    },
  };
}
