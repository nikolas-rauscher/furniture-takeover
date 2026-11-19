import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createMessagesStore } from "./messages.ts";
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
