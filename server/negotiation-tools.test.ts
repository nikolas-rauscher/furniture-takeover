import test from "node:test";
import assert from "node:assert/strict";
import { createNegotiationTools } from "./negotiation-tools.ts";
import {
  newNegotiation,
  type NegotiationUpdate,
} from "../shared/negotiation.ts";
const item = {
  id: "desk",
  title: "Desk",
  price: 80,
  description: "Pickup only. No shipping. Available Saturday 14:00–17:00.",
  location: "Lausanne",
  pickupPoint: "EPFL library entrance",
};
function harness(userText: string, current = newNegotiation("test", "desk")) {
  const events: NegotiationUpdate[] = [];
  const module = createNegotiationTools({
    userText,
    current,
    inventory: [item],
    claimTool() {},
    emit: async (event) => {
      events.push(event);
    },
  });
  const invoke = (name: keyof typeof module.tools, input: unknown) =>
    (
      module.tools[name] as unknown as {
        execute: (input: unknown) => Promise<unknown>;
      }
    ).execute(input);
  return { ...module, events, invoke };
}
test("tools preserve corrections and produce the exact structured draft used by the UI", async () => {
  const first = harness("I offer CHF 70. Saturday at 15:00.");
  await first.invoke("update_negotiation", {
    expectedVersion: 1,
    changes: {
      amount: { value: 70, origin: "buyer", quote: "CHF 70" },
      pickupTime: {
        value: "Saturday at 15:00",
        origin: "buyer",
        quote: "Saturday at 15:00",
      },
    },
  });
  const second = harness("Use the seller’s meeting point.", first.getCurrent());
  await second.invoke("update_negotiation", {
    expectedVersion: 2,
    changes: {
      pickupPoint: {
        value: "EPFL library entrance",
        origin: "listing",
        quote: "EPFL library entrance",
      },
    },
  });
  await second.invoke("prepare_offer_draft", { expectedVersion: 3 });
  assert.equal(second.getCurrent()?.terms.amount, 70);
  assert.match(second.getCurrent()!.draft!.message, /Saturday at 15:00/);
  assert.equal(
    second.events.at(-1)?.negotiation.draft?.message,
    second.getCurrent()!.draft!.message,
  );
});
test("unknown IDs, invented values, unsupported shipping and stale updates cannot mutate a proposal", async () => {
  const h = harness("CHF 70");
  await assert.rejects(h.invoke("get_listing", { listingId: "external" }));
  await assert.rejects(h.invoke("select_listing", { listingId: "external" }));
  await assert.rejects(
    h.invoke("update_negotiation", {
      expectedVersion: 1,
      changes: { amount: { value: 50, quote: "CHF 70", origin: "buyer" } },
    }),
  );
  await assert.rejects(
    h.invoke("update_negotiation", {
      expectedVersion: 1,
      changes: {
        pickupPoint: {
          value: "Berlin",
          quote: "EPFL library entrance",
          origin: "listing",
        },
      },
    }),
  );
  await assert.rejects(
    h.invoke("update_negotiation", {
      expectedVersion: 1,
      changes: {
        fulfillment: {
          value: "shipping",
          quote: "No shipping.",
          origin: "listing",
        },
      },
    }),
  );
  await assert.rejects(h.invoke("prepare_offer_draft", { expectedVersion: 2 }));
  assert.equal(h.events.length, 0);
});
test("a different listing starts with empty terms; cancellation invalidates further preparation", async () => {
  const events: NegotiationUpdate[] = [];
  const h = createNegotiationTools({
    userText: "Cancel",
    current: {
      ...newNegotiation("test", "other"),
      terms: {
        amount: 70,
        fulfillment: "pickup",
        pickupTime: "Saturday",
        pickupPoint: "EPFL",
        note: null,
      },
    },
    inventory: [item],
    claimTool() {},
    emit: async (event) => {
      events.push(event);
    },
  });
  await h.tools.select_listing.execute!(
    { listingId: "desk" },
    { toolCallId: "select", messages: [], context: {} },
  );
  assert.equal(h.getCurrent()?.terms.amount, null);
  await h.tools.discard_offer_draft.execute!(
    { expectedVersion: 1 },
    { toolCallId: "discard", messages: [], context: {} },
  );
  await assert.rejects(
    h.tools.prepare_offer_draft.execute!(
      { expectedVersion: 2 },
      { toolCallId: "prepare", messages: [], context: {} },
    ) as Promise<unknown>,
  );
  assert.equal(h.getCurrent()?.status, "discarded");
});

test("parallel tool calls cannot both overwrite the same proposal revision", async () => {
  const h = harness("CHF 70 or CHF 75");
  const changes = (amount: number) => ({
    expectedVersion: 1,
    changes: {
      amount: { value: amount, origin: "buyer", quote: `CHF ${amount}` },
    },
  });
  const outcomes = await Promise.allSettled([
    h.invoke("update_negotiation", changes(70)),
    h.invoke("update_negotiation", changes(75)),
  ]);
  assert.equal(
    outcomes.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(h.events.length, 1);
  assert.equal(h.getCurrent()?.terms.amount, 70);
});
