import test from "node:test";
import assert from "node:assert/strict";
import {
  accountInboxThread,
  demoInboxThread,
  isUnread,
  nextReadMarker,
  unreadCount,
} from "./inboxActivity.ts";

const reply = (at: string) => ({
  readKey: "c1",
  latest: { from: "them" as const, at },
});

test("a thread is unread when the other student wrote after the last read", () => {
  assert.equal(isUnread(reply("2026-11-19T12:00:00Z"), {}), true);
  assert.equal(
    isUnread(reply("2026-11-19T12:00:00Z"), { c1: "2026-11-19T11:00:00Z" }),
    true,
  );
  assert.equal(
    isUnread(reply("2026-11-19T12:00:00Z"), { c1: "2026-11-19T12:00:00Z" }),
    false,
  );
  assert.equal(
    isUnread(
      { readKey: "c1", latest: { from: "me", at: "2026-11-19T12:00:00Z" } },
      {},
    ),
    false,
  );
  assert.equal(isUnread({ readKey: "c1" }, {}), false);
});

test("the Messages badge counts conversations with news", () => {
  assert.equal(
    unreadCount(
      [
        reply("2026-11-19T12:00:00Z"),
        { ...reply("2026-11-19T12:00:00Z"), readKey: "c2" },
        { readKey: "c3", latest: { from: "me", at: "2026-11-19T12:00:00Z" } },
      ],
      { c2: "2026-11-19T13:00:00Z" },
    ),
    1,
  );
});

test("read markers only move forward", () => {
  assert.equal(
    nextReadMarker(undefined, "2026-11-19T12:00:00Z"),
    "2026-11-19T12:00:00Z",
  );
  assert.equal(
    nextReadMarker("2026-11-19T11:00:00Z", "2026-11-19T12:00:00Z"),
    "2026-11-19T12:00:00Z",
  );
  assert.equal(
    nextReadMarker("2026-11-19T12:00:00Z", "2026-11-19T11:00:00Z"),
    undefined,
  );
});

test("each inbox reads its threads from the student's side", () => {
  const conversation = {
    id: "c1",
    listingId: "desk",
    title: "Desk",
    seller: "Léa",
    messages: [
      {
        id: "m1",
        sender: "buyer" as const,
        text: "Hi",
        createdAt: "2026-11-19T11:00:00Z",
      },
      {
        id: "m2",
        sender: "seller" as const,
        text: "Hello",
        createdAt: "2026-11-19T12:00:00Z",
      },
    ],
  };
  assert.deepEqual(demoInboxThread(conversation), {
    readKey: "c1:buyer",
    latest: { from: "them", at: "2026-11-19T12:00:00Z" },
  });
  assert.deepEqual(
    accountInboxThread(
      "c2",
      { sender_id: "me", created_at: "2026-11-19T12:00:00Z" },
      "me",
    ),
    { readKey: "c2", latest: { from: "me", at: "2026-11-19T12:00:00Z" } },
  );
  assert.deepEqual(accountInboxThread("c3", undefined, "me"), {
    readKey: "c3",
    latest: undefined,
  });
});
