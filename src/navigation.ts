export type View =
  | "discover"
  | "searches"
  | "account"
  | "sell"
  | "detail"
  | "compare"
  | "messages"
  | "settings";
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

export function readRoute(hash: string): {
  view: View;
  listingId?: string;
  accountTab: "listings" | "favorites" | "archive";
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
