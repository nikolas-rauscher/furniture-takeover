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

export const SEARCH_HEADING = "Search with Pako";

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
export function destinationFor(
  view: View,
  accountTab: AccountTab,
): Destination {
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

/** The app layout for the page on screen: home, a focused page, the chat, Messages or a selling step. */
export function layoutClassName(page: {
  view: View;
  home: boolean;
  sellMode: "single" | "batch";
  sellStep: number;
}) {
  const sellLayout =
    page.sellMode === "batch"
      ? " selling-batch-layout"
      : page.sellStep === 2
        ? " selling-chat-layout"
        : " selling-photo-layout";
  return (
    "app-layout " +
    (page.home ? "home-layout" : "focused-layout") +
    (page.view === "discover" && !page.home ? " chat-layout" : "") +
    (page.view === "messages" ? " messages-layout" : "") +
    (page.view === "sell" ? sellLayout : "")
  );
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

/** The page on screen as the browser tab names it; home keeps the app's own title. */
export function pageTitle(page: {
  view: View;
  home: boolean;
  /** The search reviews the student's own listing. */
  reviewing: boolean;
  accountTab: AccountTab;
  sellMode: "single" | "batch";
  sellStep: number;
  /** The open listing's title, once it is known. */
  listingTitle: string | undefined;
  /** Accounts are on; then settings is sign-in until someone is signed in. */
  accounts: "none" | "signed-in" | "signed-out";
}): string | null {
  switch (page.view) {
    case "discover":
      if (page.home) return null;
      return page.reviewing ? "Listing review" : SEARCH_HEADING;
    case "searches":
      return "Saved searches";
    case "account":
      return page.accountTab === "favorites" ? "Saved items" : "My listings";
    case "messages":
      return "Messages";
    case "sell":
      if (page.sellMode === "batch") return "Sell several items";
      return page.sellStep === 1 ? "New listing" : "Your listing";
    case "detail":
      return page.listingTitle ?? "Listing unavailable";
    case "compare":
      return "Compare listings";
    case "settings":
      if (page.accounts === "none") return "Browser settings";
      return page.accounts === "signed-in" ? "Account settings" : "Sign in";
    case "admin":
      return "Admin";
  }
}

/** A malformed link keeps its raw segment, so the listing page says the listing is unavailable. */
function decodeRouteSegment(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export function readRoute(hash: string): {
  view: View;
  listingId?: string;
  accountTab: AccountTab;
} {
  const [path, encoded] = hash.replace(/^#/, "").split("/");
  const listingId = encoded ? decodeRouteSegment(encoded) : undefined;
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
