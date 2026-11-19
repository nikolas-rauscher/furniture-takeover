import assert from "node:assert/strict";
import test from "node:test";
import type { AdminListing } from "../../../shared/admin.ts";
import {
  actorName,
  draftOf,
  listingInput,
  logTargetNames,
  matchesFilter,
  newDraft,
  placeOfMeetingPoint,
  placeOptions,
} from "./adminFormat.ts";

const lamp: AdminListing = {
  id: "demo-1",
  sellerId: "6d1f2a52-56b1-4a8e-9a39-27a7b3d0c001",
  title: "Desk lamp",
  description: "Warm light",
  price: 1250,
  condition: "Good",
  location: "UNIL · Dorigny",
  meetingPoint: "",
  pickup: "Weekday evenings",
  pickupBy: "",
  status: "reserved",
  image: "/samples/desk-lamp.svg",
  hidden: true,
};

test("the listing filter combines title, seller and status", () => {
  const all = { query: "", sellerId: "", status: "all" } as const;
  assert.equal(matchesFilter(lamp, { ...all, query: "LAMP" }), true);
  assert.equal(matchesFilter(lamp, { ...all, query: "sofa" }), false);
  assert.equal(matchesFilter(lamp, { ...all, sellerId: "other" }), false);
  assert.equal(matchesFilter(lamp, { ...all, status: "reserved" }), true);
  assert.equal(matchesFilter(lamp, { ...all, status: "active" }), false);
  assert.equal(matchesFilter(lamp, { ...all, status: "hidden" }), true);
});

test("a draft round-trips to the save input with a typed price", () => {
  const draft = { ...draftOf(lamp), price: "1'250.50" };
  assert.deepEqual(listingInput(draft), {
    input: { ...draftOf(lamp), price: 1250.5 },
  });
  assert.deepEqual(listingInput({ ...draft, price: "" }), {
    problem: "Enter a price in CHF, 0 for free.",
  });
  assert.deepEqual(listingInput({ ...draft, title: " " }), {
    problem: "Add a title.",
  });
  assert.deepEqual(listingInput({ ...draft, status: "withdrawn" }), {
    problem: "Choose active, reserved or sold.",
  });
});

test("a new draft starts active in the first place, without an id", () => {
  const draft = newDraft(lamp.sellerId, lamp.image);
  assert.equal(draft.id, undefined);
  assert.equal(draft.status, "active");
  assert.equal(draft.location, placeOptions[0]);
});

test("places and actors read plainly", () => {
  assert.equal(new Set(placeOptions).size, placeOptions.length);
  assert.equal(
    placeOfMeetingPoint("Gare de Lausanne · main hall"),
    "Lausanne · Centre",
  );
  assert.equal(placeOfMeetingPoint("Nowhere"), undefined);
  assert.equal(actorName("demo-developer"), "Developer mode");
  assert.equal(
    actorName("0f9c2b4e-1111-4222-8333-944445555666"),
    "Admin 0f9c2b4e",
  );
});

test("the moderation log names reports, listings and blocked students", () => {
  const studentId = "6d1f2a52-56b1-4a8e-9a39-27a7b3d0c002";
  const report = {
    reporterId: "6d1f2a52-56b1-4a8e-9a39-27a7b3d0c003",
    studentId,
    reason: "Spam",
    createdAt: "2026-11-19T21:15:00.000Z",
    resolvedAt: null,
  };
  const names = logTargetNames({
    reports: [
      {
        ...report,
        id: "6d1f2a52-56b1-4a8e-9a39-27a7b3d0c004",
        target: {
          kind: "listing",
          id: "demo-1",
          title: "Desk lamp",
          description: "",
          hidden: false,
        },
      },
      {
        ...report,
        id: "6d1f2a52-56b1-4a8e-9a39-27a7b3d0c005",
        target: {
          kind: "message",
          id: "m-1",
          conversationId: "c-1",
          listingId: "demo-2",
          body: "Pay first",
        },
      },
    ],
    blocks: [
      { studentId, name: null, reason: "Spam", at: "2026-11-19T21:16:00.000Z" },
    ],
    listings: [{ id: "demo-3", title: "Bookshelf" }],
  });
  assert.equal(names.get("6d1f2a52-56b1-4a8e-9a39-27a7b3d0c004"), "Desk lamp");
  assert.equal(names.get("demo-3"), "Bookshelf");
  assert.equal(
    names.get("6d1f2a52-56b1-4a8e-9a39-27a7b3d0c005"),
    "Message about a listing",
  );
  assert.equal(names.get(studentId), "Student 6d1f2a52");
});
