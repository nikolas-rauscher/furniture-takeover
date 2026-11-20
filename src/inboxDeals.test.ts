import test from "node:test";
import assert from "node:assert/strict";
import type { Deal } from "../shared/deal.ts";
import type { SellerConversation } from "../shared/messages.ts";
import {
  accountInboxDeals,
  buyerDealFor,
  demoInboxDeals,
  newestAt,
  reservedForMe,
  sellerAgreementFor,
} from "./inboxDeals.ts";

function deal(listingId: string, status: Deal["status"] = "open"): Deal {
  return {
    conversationId: `c-${listingId}`,
    listingId,
    version: 1,
    status,
    proposal: null,
    agreed: null,
    outcome: null,
    updatedAt: "2026-11-19T13:00:00.000Z",
  };
}

test("local threads are the student's purchases; other demo buyers are left out", () => {
  const conversation = (
    listingId: string,
    extra: Partial<SellerConversation> = {},
  ) => ({
    id: `c-${listingId}`,
    listingId,
    title: "Desk",
    seller: "Demo seller",
    messages: [],
    ...extra,
  });
  const offer = {
    id: "m1",
    sender: "buyer" as const,
    text: "Would you take CHF 40?",
    createdAt: "2026-11-18T10:00:00.000Z",
  };
  assert.deepEqual(
    demoInboxDeals([
      conversation("l1", { deal: deal("l1", "agreed") }),
      conversation("l2"),
      conversation("l3", { deal: deal("l3"), buyerKey: "b2" }),
      conversation("l4", { deal: deal("l4"), messages: [offer] }),
    ]),
    [
      {
        deal: deal("l1", "agreed"),
        role: "buyer",
        listingId: "l1",
        threadId: "c-l1",
        otherName: "Demo seller",
        latest: undefined,
      },
      {
        deal: deal("l4"),
        role: "buyer",
        listingId: "l4",
        threadId: "c-l4",
        otherName: "Demo seller",
        latest: {
          id: "m1",
          from: "me",
          text: "Would you take CHF 40?",
          at: "2026-11-18T10:00:00.000Z",
        },
      },
    ],
  );
});

test("account deals are seen from the student's side, named like the inbox", () => {
  const rows = {
    threads: [
      {
        id: "c-l1",
        listing_id: "l1",
        buyer_id: "me",
        seller_id: "lea",
        created_at: "",
      },
      {
        id: "c-l2",
        listing_id: "l2",
        buyer_id: "arjun",
        seller_id: "me",
        created_at: "",
      },
      {
        id: "c-l3",
        listing_id: "l3",
        buyer_id: "noe",
        seller_id: "me",
        created_at: "",
      },
    ],
    deals: { "c-l1": deal("l1"), "c-l2": deal("l2", "agreed") },
    names: { lea: "Léa" },
    latest: {
      "c-l1": {
        id: "m1",
        conversation_id: "c-l1",
        sender_id: "lea",
        body: "45 and it's yours.",
        created_at: "2026-11-19T12:00:00.000Z",
      },
    },
  };
  const deals = accountInboxDeals(rows, "me");
  assert.deepEqual(
    deals.map(({ role, otherName, threadId, latest }) => ({
      role,
      otherName,
      threadId,
      latest,
    })),
    [
      {
        role: "buyer",
        otherName: "Léa",
        threadId: "c-l1",
        latest: {
          id: "m1",
          from: "them",
          text: "45 and it's yours.",
          at: "2026-11-19T12:00:00.000Z",
        },
      },
      {
        role: "seller",
        otherName: "Buyer",
        threadId: "c-l2",
        latest: undefined,
      },
    ],
  );
  assert.deepEqual(accountInboxDeals({ ...rows, deals: null }, "me"), []);
  assert.equal(buyerDealFor(deals, "l1")?.threadId, "c-l1");
  assert.equal(buyerDealFor(deals, "l2"), undefined);
  assert.equal(sellerAgreementFor(deals, "l2")?.otherName, "Buyer");
  assert.equal(sellerAgreementFor(deals, "l1"), undefined);
  assert.deepEqual([...reservedForMe(deals)], []);
  assert.deepEqual(
    [...reservedForMe([{ ...deals[0], deal: deal("l1", "agreed") }])],
    ["l1"],
  );
});

test("a read marker moves to the newest of a message and news nobody wrote", () => {
  assert.equal(
    newestAt(["2026-11-19T13:00:00.000Z", undefined, "2026-11-19T14:00:00Z"]),
    "2026-11-19T14:00:00Z",
  );
  assert.equal(newestAt([undefined]), undefined);
});
