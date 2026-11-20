import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAccountDeals } from "../cloud/accountDealsApi.ts";
import type { DealRow } from "../cloud/client.ts";
import { demoDeals } from "./demoDeals.ts";
import type { DealsApi } from "./deals.ts";

const target = {
  conversationId: "thread",
  listing: { id: "desk", title: "Desk", seller: "Seller", status: "reserved" },
  role: "seller",
} as const;
const timestamp = "2026-11-20T17:00:00.000Z";
const terms = {
  amount: 30,
  fulfillment: "pickup",
  pickupAt: timestamp,
  pickupTime: "Fri 20 Nov, 18:00",
  pickupPoint: "Atrium",
} as const;
const common = {
  conversationId: "thread",
  listingId: "desk",
  updatedAt: timestamp,
  proposal: null,
  agreed: { terms, at: timestamp },
  outcome: null,
};
const row: DealRow = {
  conversation_id: target.conversationId,
  listing_id: target.listing.id,
  status: "agreed",
  version: 2,
  agreed: {
    amount: terms.amount,
    fulfillment: terms.fulfillment,
    pickup_at: terms.pickupAt,
    pickup_time: terms.pickupTime,
    pickup_point: terms.pickupPoint,
  },
  agreed_at: timestamp,
  updated_at: timestamp,
  proposal: null,
  proposal_by: null,
  proposal_message_id: null,
  outcome: null,
  outcome_by: null,
};

function mockDemo(t: TestContext): DealsApi {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => "demo-workspace" },
  });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (path: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      assert.equal(body.sender, "seller");
      assert.equal(body.listingId, "desk");
      if (path === "/api/messages/deal") {
        assert.equal(body.expectedVersion, 1);
        assert.equal(body.messageId, "agree");
        assert.equal(body.action.type, "accept");
        return Response.json({
          conversation: { deal: { ...common, status: "agreed", version: 2 } },
          statusChange: "reserved",
        });
      }
      assert.equal(path, "/api/messages/pickup");
      assert.equal(body.expectedVersion, 2);
      assert.equal(body.messageId, "collect");
      assert.equal(body.action.type, "picked_up");
      return Response.json({
        conversation: { deal: { ...common, status: "completed", version: 3 } },
        statusChange: "sold",
      });
    },
  );
  return demoDeals;
}

function mockAccount(): DealsApi {
  const client = {
    rpc(name: string, params: Record<string, unknown>) {
      assert.equal(params.p_conversation, "thread");
      if (name === "deal_action") {
        assert.equal(params.p_expected_version, 1);
        assert.equal(params.p_message, "agree");
        assert.equal(params.p_action, "accept");
        return { single: async () => ({ data: row, error: null }) };
      }
      assert.equal(name, "pickup_action");
      assert.equal(params.p_expected_version, 2);
      assert.equal(params.p_message, "collect");
      assert.equal(params.p_action, "picked_up");
      return {
        single: async () => ({
          data: { ...row, status: "completed", version: 3 },
          error: null,
        }),
      };
    },
  } as unknown as SupabaseClient;
  return createAccountDeals(client);
}

for (const [mode, mock] of Object.entries({
  demo: mockDemo,
  account: mockAccount,
})) {
  test(`${mode} deal actions return the version and listing status after agreement and pickup`, async (t) => {
    const api = mock(t);
    const agreed = await api.submit(target, {
      action: { type: "accept", terms },
      text: "Agreed, see you at 18:00.",
      expectedVersion: 1,
      messageId: "agree",
    });
    assert.equal(agreed.deal.status, "agreed");
    assert.equal(agreed.deal.version, 2);
    assert.equal(agreed.statusChange, "reserved");
    const collected = await api.pickup(target, {
      action: { type: "picked_up" },
      text: "Collected. Thank you!",
      expectedVersion: agreed.deal.version,
      messageId: "collect",
    });
    assert.equal(collected.deal.status, "completed");
    assert.equal(collected.deal.version, 3);
    assert.equal(collected.statusChange, "sold");
  });
}
