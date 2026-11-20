export type View =
  | "discover"
  | "searches"
  | "account"
  | "sell"
  | "detail"
  | "compare"
  | "messages"
  | "settings"
  | "admin";
/**
 * Where a history entry sits in this tab's history. The app numbers the
 * entries it adds, so Back and Forward can tell which way they lead; an entry
 * it did not add, such as the one it was opened with, counts as the start.
 */
export function historyPosition(state: unknown): number {
  return typeof state === "object" &&
    state !== null &&
    "position" in state &&
    typeof state.position === "number"
    ? state.position
    : 0;
}

export type AccountTab = "favorites" | "listings" | "archive";

/** Where the mobile bar and header lead; settings sits beside them. */
export type Destination =
  | "browse"
  | "searches"
  | "sell"
  | "favorites"
  | "account"
  | "messages"
  | "settings";

/** Order of the mobile bar, left to right: tabs, then Sell beside them, then settings. */
const DESTINATION_ORDER: Destination[] = [
  "browse",
  "searches",
  "favorites",
  "messages",
  "account",
  "sell",
  "settings",
];

/** Pages a signed-out student cannot open; they lead to sign-in instead. */
const SIGNED_IN_VIEWS: View[] = ["sell", "messages", "account", "searches"];

export function needsSignIn(view: View) {
  return SIGNED_IN_VIEWS.includes(view);
}

/** The destination the header and mobile bar highlight for a page. */
export function destinationFor(view: View, accountTab: AccountTab): Destination {
  switch (view) {
    case "sell":
    case "messages":
    case "searches":
      return view;
    case "settings":
    case "admin":
      return "settings";
    case "account":
      return accountTab === "favorites" ? "favorites" : "account";
    default:
      return "browse";
  }
}

/** Tabs to the right push in from the right; tabs to the left from the left. */
export function destinationDirection(from: Destination, to: Destination) {
  return DESTINATION_ORDER.indexOf(to) >= DESTINATION_ORDER.indexOf(from)
    ? "nav-forward"
    : "nav-back";
}

/** The address a page is opened at. */
export function viewHash(view: View) {
  if (view === "discover") return "";
  return view === "account" ? "#listings" : `#${view}`;
}

export function accountTabHash(tab: AccountTab) {
  if (tab === "favorites") return "#saved";
  return tab === "archive" ? "#listings/archive" : "#listings";
}

/** Names the page on screen, so each one keeps its own scroll position. */
export function pageKey(page: {
  view: View;
  home: boolean;
  accountTab: AccountTab;
  sellMode: "single" | "batch";
  sellStep: number;
  selectedId: string | null;
}) {
  switch (page.view) {
    case "discover":
      return page.home ? "home" : "search";
    case "account":
      return `account-${page.accountTab}`;
    case "sell":
      return page.sellMode === "batch" ? "sell-batch" : `sell-${page.sellStep}`;
    case "detail":
      return `listing-${page.selectedId}`;
    default:
      return page.view;
  }
}

/** The way back from a listing names the page it was opened from. */
export function detailBackLabel(
  origin: View,
  searching: boolean,
  accountTab: AccountTab,
) {
  switch (origin) {
    case "discover":
      return searching ? "Back to search" : "Back to browse";
    case "account":
      return accountTab === "favorites"
        ? "Back to saved items"
        : "Back to my listings";
    case "messages":
      return "Back to messages";
    case "compare":
      return "Back to comparison";
    default:
      return "Back";
  }
}

export function readRoute(hash: string): {
  view: View;
  listingId?: string;
  accountTab: AccountTab;
} {
  const [path, encoded] = hash.replace(/^#/, "").split("/");
  let listingId: string | undefined;
  try {
    listingId = encoded ? decodeURIComponent(encoded) : undefined;
  } catch {
    /* Ignore malformed external links. */
  }
  const routes: Record<string, View> = {
    messages: "messages",
    settings: "settings",
    admin: "admin",
    listings: "account",
    account: "account",
    saved: "account",
    searches: "searches",
    sell: "sell",
    listing: "detail",
    compare: "compare",
  };
  return {
    view:
      path === "listing" && !listingId
        ? "discover"
        : (routes[path] ?? "discover"),
    listingId,
    accountTab:
      path === "saved"
        ? "favorites"
        : path === "listings" && encoded === "archive"
          ? "archive"
          : "listings",
  };
}
