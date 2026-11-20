import test from "node:test";
import assert from "node:assert/strict";
import {
  accountTabHash,
  destinationDirection,
  destinationFor,
  detailBackLabel,
  historyPosition,
  needsSignIn,
  pageKey,
  pageTitle,
  layoutClassName,
  readRoute,
  viewHash,
} from "./navigation.ts";

test("direct links preserve the selected workspace section on reload", () => {
  assert.equal(readRoute("#settings").view, "settings");
  assert.equal(readRoute("#admin").view, "admin");
  assert.equal(readRoute("#listings").view, "account");
  assert.equal(readRoute("#listings/archive").accountTab, "archive");
  assert.equal(readRoute("#saved").accountTab, "favorites");
  assert.equal(readRoute("#searches").view, "searches");
});

test("listing and conversation links restore their item without crashing on bad links", () => {
  assert.equal(readRoute("#listing/desk%20one").listingId, "desk one");
  assert.equal(readRoute("#listing/desk").view, "detail");
  assert.equal(readRoute("#messages/desk").listingId, "desk");
  assert.equal(readRoute("#messages/desk").view, "messages");
  for (const hash of ["", "#unknown", "#listing", "#listing/%invalid"]) {
    assert.equal(readRoute(hash).view, "discover");
  }
});

test("history entries tell how far into the visit they are", () => {
  assert.equal(historyPosition({ position: 3 }), 3);
  for (const state of [null, undefined, "#saved", {}, { position: "3" }]) {
    assert.equal(historyPosition(state), 0);
  }
});

test("the header and mobile bar highlight the destination a page belongs to", () => {
  assert.equal(destinationFor("detail", "listings"), "browse");
  assert.equal(destinationFor("admin", "listings"), "settings");
  assert.equal(destinationFor("account", "favorites"), "favorites");
  assert.equal(destinationFor("account", "archive"), "account");
  assert.equal(destinationFor("messages", "listings"), "messages");
});

test("destinations to the right slide in forward, to the left back", () => {
  assert.equal(destinationDirection("browse", "messages"), "nav-forward");
  assert.equal(destinationDirection("messages", "browse"), "nav-back");
  assert.equal(destinationDirection("sell", "sell"), "nav-forward");
});

test("pages open at addresses that read back to the same page", () => {
  for (const view of ["discover", "account", "messages", "settings"] as const)
    assert.equal(readRoute(viewHash(view)).view, view);
  for (const tab of ["favorites", "listings", "archive"] as const)
    assert.equal(readRoute(accountTabHash(tab)).accountTab, tab);
});

test("each page keeps its own scroll position key", () => {
  const page = {
    view: "discover" as const,
    home: true,
    accountTab: "listings" as const,
    sellMode: "single" as const,
    sellStep: 1,
    selectedId: null,
  };
  assert.equal(pageKey(page), "home");
  assert.equal(pageKey({ ...page, home: false }), "search");
  assert.equal(pageKey({ ...page, view: "sell", sellStep: 2 }), "sell-2");
  assert.equal(
    pageKey({ ...page, view: "sell", sellMode: "batch" }),
    "sell-batch",
  );
  assert.equal(
    pageKey({ ...page, view: "detail", selectedId: "a" }),
    "listing-a",
  );
  assert.equal(
    pageKey({ ...page, view: "account", accountTab: "archive" }),
    "account-archive",
  );
});

test("only signed-in pages ask for a sign-in", () => {
  assert.equal(needsSignIn("messages"), true);
  assert.equal(needsSignIn("detail"), false);
});

test("the way back from a listing names where it was opened", () => {
  assert.equal(detailBackLabel("discover", true, "listings"), "Back to search");
  assert.equal(
    detailBackLabel("account", false, "favorites"),
    "Back to saved items",
  );
  assert.equal(detailBackLabel("settings", false, "listings"), "Back");
});

test("the browser tab names the page on screen, home keeps the app's title", () => {
  const page = {
    view: "discover" as const,
    home: true,
    reviewing: false,
    accountTab: "listings" as const,
    sellMode: "single" as const,
    sellStep: 1,
    listingTitle: undefined,
    accounts: "none" as const,
  };
  assert.equal(pageTitle(page), null);
  assert.equal(pageTitle({ ...page, home: false }), "Search with Pako");
  assert.equal(
    pageTitle({ ...page, home: false, reviewing: true }),
    "Listing review",
  );
  assert.equal(pageTitle({ ...page, view: "detail" }), "Listing unavailable");
  assert.equal(
    pageTitle({ ...page, view: "detail", listingTitle: "Desk" }),
    "Desk",
  );
  assert.equal(pageTitle({ ...page, view: "settings" }), "Browser settings");
  assert.equal(
    pageTitle({ ...page, view: "settings", accounts: "signed-out" }),
    "Sign in",
  );
  assert.equal(
    pageTitle({ ...page, view: "sell", sellMode: "batch" }),
    "Sell several items",
  );
});

test("each page gets its layout", () => {
  const page = {
    view: "discover" as const,
    home: true,
    sellMode: "single" as const,
    sellStep: 1,
  };
  assert.equal(layoutClassName(page), "app-layout home-layout");
  assert.equal(
    layoutClassName({ ...page, home: false }),
    "app-layout focused-layout chat-layout",
  );
  assert.equal(
    layoutClassName({ ...page, home: false, view: "sell", sellStep: 2 }),
    "app-layout focused-layout selling-chat-layout",
  );
  assert.equal(
    layoutClassName({ ...page, home: false, view: "sell", sellMode: "batch" }),
    "app-layout focused-layout selling-batch-layout",
  );
});
