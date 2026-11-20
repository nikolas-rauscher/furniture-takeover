import test from "node:test";
import assert from "node:assert/strict";
import {
  accountInboxThread,
  demoInboxThread,
  inboxBadge,
  isUnread,
  nextReadMarker,
  unreadCount,
  pickupActivity,
  pickupHomeDeals,
} from "./inboxActivity.ts";
import type { Deal } from "../shared/deal.ts";

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

test("a system event counts as new activity until the viewer reads it",()=>{
 const at="2026-11-19T13:00:00Z";
 const thread=demoInboxThread({id:"c",title:"Desk",listingId:"desk",seller:"Seller",messages:[],systemEvents:[{kind:"superseded",at}]});
 assert.ok(isUnread(thread,{}));
 assert.equal(isUnread(thread,{[thread.readKey]:at}),false);
 assert.deepEqual(accountInboxThread("c",undefined,"buyer",{sender_id:null,created_at:at}).latest,thread.latest);
});

test("a pickup due in 90 minutes is your turn and counts once in the badge", () => {
  const now = new Date("2026-11-19T10:30:00Z");
  const agreed = {
    terms: {
      fulfillment: "pickup" as const, amount: 30, pickupAt: "2026-11-19T12:00:00Z",
      pickupTime: "Thu 19 Nov, 13:00", pickupPoint: "Vortex",
    },
    at: "2026-11-18T12:00:00Z",
  };
  const deal: Deal = {
    conversationId: "c1", listingId: "desk", status: "agreed",
    agreed, version: 2, updatedAt: agreed.at, outcome: null, proposal: null,
  };
  const offer: Deal = {
    ...deal, conversationId: "c2", status: "open", agreed: null,
    proposal: { by: "seller", terms: agreed.terms, messageId: null },
  };
  assert.deepEqual(pickupActivity(deal, "buyer", now), {
    pickupSoon: true, due: true, needsYou: true, label: "Your turn",
  });
  const threads = [reply("2026-11-19T10:00:00Z"), { readKey: "c2" }];
  assert.equal(inboxBadge(threads, {}, new Set(["c1"])), 1);
  assert.equal(inboxBadge(threads, { c1: now.toISOString() }, new Set(["c1"])), 1);
  assert.deepEqual(pickupHomeDeals([offer, deal], () => "buyer", now), [deal, offer]);
});

test("Pako's open pickup question leads Home, ahead of a pickup due now", () => {
  const terms = (pickupAt: string) => ({
    fulfillment: "pickup" as const, amount: 30, pickupAt,
    pickupTime: "", pickupPoint: "Vortex",
  });
  const booked = (conversationId: string, pickupAt: string): Deal => ({
    conversationId, listingId: conversationId, status: "agreed", proposal: null,
    agreed: { terms: terms(pickupAt), at: "2026-11-17T12:00:00Z" },
    version: 2, updatedAt: "2026-11-17T12:00:00Z", outcome: null,
  });
  const now = new Date("2026-11-19T12:30:00Z");
  const dueNow = booked("now", "2026-11-19T12:00:00Z");
  const unclosed = booked("past", "2026-11-18T11:00:00Z");
  assert.deepEqual(pickupHomeDeals([dueNow, unclosed], () => "seller", now), [unclosed, dueNow]);
});
