import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealRow } from "./client.ts";
import {
  pickupUpdateNeeded,
  readDeal,
  sendAccountDeal,
  sendAccountPickup,
} from "./deals.ts";

const legacy: DealRow = {
  conversation_id: "conversation",
  listing_id: "desk",
  status: "agreed",
  version: 2,
  agreed: {
    amount: 30,
    fulfillment: "pickup",
    pickup_at: "2026-11-20T17:00:00Z",
    pickup_time: "Fri 20 Nov, 18:00",
    pickup_point: "Atrium",
  },
  agreed_at: "2026-11-19T17:00:00Z",
  updated_at: "2026-11-19T17:00:00Z",
  proposal: null,
  proposal_by: null,
  proposal_message_id: null,
  outcome: null,
  outcome_by: null,
};
const migrated: DealRow = {
  ...legacy,
  buyer_on_way_at: null,
  seller_on_way_at: null,
  late_at: null,
  late_by: null,
  late_minutes: null,
  buyer_picked_up_at: null,
  no_show_at: null,
  no_show_by: null,
  pickup_cancel_reason: null,
};
test("a legacy pre-agreement cancellation reads as an open negotiation", () => {
  const deal = readDeal({
    ...migrated,
    status: "cancelled",
    agreed: null,
    agreed_at: null,
    outcome: "cancelled",
    outcome_by: "seller",
  });
  assert.equal(deal.status, "open");
  assert.equal(deal.outcome, null);
  assert.equal(deal.version, migrated.version);
  assert.equal(
    readDeal({ ...migrated, status: "cancelled" }).status,
    "cancelled",
  );
});

test("account clients keep ordinary deals working while pickup columns and RPC are absent", async () => {
  assert.equal(readDeal(legacy).pickup, undefined);
  assert.deepEqual(readDeal(migrated).pickup, {
    onWay: { buyer: null, seller: null },
    late: null,
    noShow: null,
    buyerPickedUpAt: null,
    cancelReason: null,
  });
  const client = {
    rpc: (name: string) => ({
      single: async () =>
        name === "deal_action"
          ? {
              data: { ...legacy, status: "cancelled", version: 3 },
              error: null,
            }
          : { error: { code: "PGRST202", message: "Function not found" } },
    }),
  } as unknown as SupabaseClient;
  const result = await sendAccountDeal(
    client,
    "conversation",
    { type: "cancel", reason: "cant_make_it" },
    "Sorry!",
    2,
    "message",
  );
  assert.equal(result.statusChange, "active");
  await assert.rejects(
    sendAccountPickup(
      client,
      "conversation",
      { type: "on_my_way" },
      "On my way!",
      2,
      "message",
    ),
    {
      message: pickupUpdateNeeded,
    },
  );
});

test("an account pickup writes the expected version and returns a sale transition only for completion", async () => {
  const call = (row: DealRow) =>
    ({
      rpc: (name: string, params: Record<string, unknown>) => {
        assert.equal(name, "pickup_action");
        assert.equal(params.p_expected_version, 2);
        assert.equal(params.p_message, "message");
        assert.equal(params.p_action, "picked_up");
        return { single: async () => ({ data: row, error: null }) };
      },
    }) as unknown as SupabaseClient;
  const send = (row: DealRow) =>
    sendAccountPickup(
      call(row),
      "conversation",
      { type: "picked_up" },
      "Thanks!",
      2,
      "message",
    );
  const report = await send({
    ...migrated,
    version: 3,
    buyer_picked_up_at: legacy.updated_at,
  });
  assert.equal(report.deal.pickup?.buyerPickedUpAt, legacy.updated_at);
  assert.equal(report.statusChange, undefined);
  const sale = await send({
    ...migrated,
    version: 3,
    status: "completed",
    outcome: "picked_up",
    outcome_by: "seller",
  });
  assert.equal(sale.statusChange, "sold");
});
