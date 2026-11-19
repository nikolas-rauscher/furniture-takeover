import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createMessagesStore } from "./messages.ts";
import { formatPickup } from "../shared/pickupTime.ts";
import { dealScenarios } from "../shared/dealScenarios.ts";
test("Demo actions write the message and deal together, scoped to one workspace", () => {
  const store = createMessagesStore(":memory:");
  try {
    for (const scenario of dealScenarios) {
      const workspace = randomUUID();
      let version = 0;
      for (const step of scenario.steps) {
        const input = {
          listingId: "desk",
          listingStatus: "active",
          title: "Desk",
          seller: "Seller",
          text: step.body,
          sender: step.actor,
          messageId: randomUUID(),
          expectedVersion: version,
          action: step.action,
        };
        const before = store.list(workspace);
        if (step.error) {
          assert.throws(() => store.act(workspace, input), {
            code: step.error,
          });
          assert.deepEqual(store.list(workspace), before);
          continue;
        }
        const result = store.act(workspace, input);
        assert.equal(result.conversation.deal?.version, ++version);
        assert.equal(result.statusChange, step.statusChange);
        assert.deepEqual(store.act(workspace, input), result);
        assert.equal(result.conversation.messages.length, version);
        assert.deepEqual(store.list(randomUUID()), []);
      }
    }
    const offer = {
      listingId: "desk",
      listingStatus: "active",
      title: "Desk",
      seller: "Seller",
      text: "CHF 30 shipped?",
      sender: "buyer",
      messageId: randomUUID(),
      expectedVersion: 0,
      action: dealScenarios[0].steps[0].action,
    };
    assert.throws(() => store.act("empty", { ...offer, sender: "seller" }), {
      code: "NO_CONVERSATION",
    });
    const a = store.act("one", offer);
    const b = store.act("one", {
      ...offer,
      buyerKey: randomUUID(),
      messageId: randomUUID(),
    });
    assert.throws(
      () => store.act("one", { ...offer, messageId: randomUUID() }),
      { code: "deal_changed" },
    );
    store.act("one", {
      ...offer,
      sender: "seller",
      messageId: randomUUID(),
      expectedVersion: 1,
      action: { ...offer.action, type: "accept" },
    });
    assert.throws(() =>
      store.setDeleted("one", { id: a.conversation.id }, true),
    );
    const superseded = store
      .list("one")
      .find((c) => c.id === b.conversation.id)!;
    assert.equal(superseded.deal?.proposal, null);
    assert.equal(superseded.systemEvents?.[0].kind, "superseded");
  } finally {
    store.close();
  }
});

test("demo pickup checks notify once and release or complete a reservation", () => {
  let now = new Date("2026-11-20T12:00:00Z");
  const store = createMessagesStore(":memory:", () => now);
  const pickupAt = "2026-11-20T15:00:00.000Z";
  const terms = { amount: 30, fulfillment: "pickup", pickupAt, pickupTime: formatPickup(pickupAt), pickupPoint: "Atrium" };
  try {
    for (const resolution of ["expired", "confirm_pickup_happened", "release_stale_pickup", "release_no_show"]) {
      now = new Date("2026-11-20T12:00:00Z");
      const workspace = randomUUID();
      const send = { listingId: "desk", title: "Desk", seller: "Seller", text: "CHF 30, Atrium, 16:00." };
      const act = (type: string, version: number, sender = "buyer") => store.act(workspace, {
        ...send, listingStatus: "active", expectedVersion: version, action: { type, terms },
        sender, messageId: randomUUID(),
      });
      const resolve = () => store.actPickup(workspace, {
        ...send, listingStatus: "reserved", expectedVersion: 2, action: { type: resolution },
        sender: "buyer", messageId: randomUUID(),
      });
      const { conversation } = act("propose", 0);
      act("accept", 1, "seller");
      now = new Date("2026-11-21T14:59:59.999Z");
      assert.equal(store.list(workspace)[0].systemEvents, undefined);
      if (resolution !== "release_no_show" && resolution !== "expired")
        assert.throws(resolve, { code: "pickup_check_not_due" });
      now = new Date("2026-11-21T15:00:00.000Z");
      assert.deepEqual(store.list(workspace)[0].systemEvents, [
        { kind: "pickup_check_due", at: now.toISOString() },
      ]);
      assert.equal(store.list(workspace)[0].systemEvents?.length, 1);
      if (resolution === "expired") {
        now = new Date("2026-11-22T15:00:00.000Z");
        assert.equal(store.list(workspace)[0].deal?.outcome?.kind, "pickup_expired");
        assert.equal(store.list(workspace)[0].systemEvents?.length, 2);
      } else {
        assert.equal(resolve().statusChange, resolution === "confirm_pickup_happened" ? "sold" : "active");
      }
      if (resolution !== "confirm_pickup_happened") {
        const reopened = act("propose", 3).conversation;
        assert.equal(reopened.id, conversation.id);
        assert.equal(reopened.deal?.status, "open");
        assert.equal(reopened.deal?.agreed, null);
        assert.equal(reopened.messages[1].deal?.kind, "accepted");
      }
    }
  } finally {
    store.close();
  }
});
