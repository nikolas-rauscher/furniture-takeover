import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createMessagesStore } from "./messages.ts";
import { pickupScenarios, type PickupStep } from "../shared/dealScenarios.ts";
import { acceptMessage, offerMessage } from "../shared/dealMessages.ts";
import { formatPickup } from "../shared/pickupTime.ts";
import type { DealTerms } from "../shared/deal.ts";

test("messages keep a listing's illustration without rejecting a short draft", () => {
  const store = createMessagesStore(":memory:");
  try {
    const workspace = randomUUID();
    const image = "/samples/city-bicycle.svg";
    const conversation = store.send(workspace, {
      listingId: "demo-v2-1",
      title: "City bicycle",
      seller: "Arjun",
      image,
      text: "Hi, is the City bicycle still available?",
      sender: "buyer",
      messageId: randomUUID(),
    });
    assert.equal(conversation.image, image);
    assert.equal(store.list(workspace)[0].image, image);
    assert.equal(conversation.messages.length, 1);
  } finally {
    store.close();
  }
});

test("message validation distinguishes invalid photos from invalid message text", () => {
  const store = createMessagesStore(":memory:");
  try {
    const workspace = randomUUID();
    const message = {
      listingId: "desk",
      title: "Desk",
      seller: "Seller",
      text: "Is it available?",
      sender: "buyer",
      messageId: randomUUID(),
    };
    for (const image of [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zy8+",
      "http://example.com/photo.jpg",
      "https://user:password@example.com/photo.jpg",
      "https://example.com/" + "x".repeat(4096),
    ]) {
      assert.throws(() => store.send(workspace, { ...message, image }), {
        code: "INVALID_MESSAGE",
        message:
          "The listing photo could not be attached. Please use another photo.",
      });
    }
    for (const text of ["   ", "x".repeat(4001)])
      assert.throws(() => store.send(workspace, { ...message, text }), {
        code: "INVALID_MESSAGE",
        message: "Enter a message of up to 4,000 characters.",
      });
    assert.equal(store.list(workspace).length, 0);
    const uploaded = store.send(workspace, {
      ...message,
      image: "data:image/png;base64,YWJj",
    });
    assert.equal(uploaded.image, "data:image/png;base64,YWJj");
  } finally {
    store.close();
  }
});
test("local inbox stores exact messages, separates workspaces and deduplicates retries", () => {
  const store = createMessagesStore(":memory:");
  try {
    const workspace = randomUUID();
    const message = {
      listingId: "test-book",
      title: "Test book",
      seller: "Test seller",
      text: "Can I collect this weekend?",
      sender: "buyer",
      messageId: randomUUID(),
    };
    const first = store.send(workspace, message);
    assert.equal(store.send(workspace, message).messages.length, 1);
    assert.equal(store.list(randomUUID()).length, 0);
    const reply = store.send(workspace, {
      ...message,
      sender: "seller",
      text: "Saturday works.",
      messageId: randomUUID(),
    });
    assert.equal(reply.id, first.id);
    assert.deepEqual(
      store.list(workspace)[0].messages.map((item) => item.text),
      [message.text, "Saturday works."],
    );
    assert.throws(() => store.send(workspace, { ...message, text: "   " }));
  } finally {
    store.close();
  }
});

test("conversation deletion is workspace-scoped, persistent and reversible with photos intact", () => {
  const store = createMessagesStore(":memory:");
  try {
    const workspace = randomUUID();
    const conversation = store.send(workspace, {
      listingId: "desk",
      title: "Desk",
      seller: "Seller",
      image: "/images/desk.jpg",
      text: "Is it available?",
      sender: "buyer",
      messageId: randomUUID(),
    });
    assert.equal(store.list(workspace)[0].image, "/images/desk.jpg");
    assert.throws(() =>
      store.setDeleted(randomUUID(), { id: conversation.id }, true),
    );
    assert.equal(store.list(workspace).length, 1);
    store.setDeleted(workspace, { id: conversation.id }, true);
    assert.equal(store.list(workspace).length, 0);
    store.setDeleted(workspace, { id: conversation.id }, true);
    const restored = store.setDeleted(
      workspace,
      { id: conversation.id },
      false,
    );
    assert.deepEqual(restored, conversation);
    assert.equal(store.list(workspace).length, 1);
    assert.throws(() =>
      store.setDeleted(workspace, { id: "../invalid" }, true),
    );
  } finally {
    store.close();
  }
});

test("demo pickup updates are atomic, versioned and idempotent by message", () => {
  const store = createMessagesStore(":memory:");
  const workspace = randomUUID();
  const base = { listingId: "desk", title: "Desk", seller: "Seller" };
  const pickup = Date.now() + 4 * 3600000;
  const pickupAt = new Date(pickup).toISOString();
  const terms: DealTerms = {
    amount: 30,
    fulfillment: "pickup",
    pickupAt,
    pickupTime: formatPickup(pickupAt),
    pickupPoint: "Atrium",
  };
  const buyerKey = randomUUID();
  try {
    const other = store.send(workspace, {
      ...base,
      buyerKey,
      text: "Still interested if it becomes available.",
      sender: "buyer",
      messageId: randomUUID(),
    });
    const { conversation } = store.act(workspace, {
      ...base,
      action: { type: "propose", terms },
      sender: "buyer",
      text: offerMessage(base.title, terms),
      listingStatus: "active",
      expectedVersion: 0,
      messageId: randomUUID(),
    });
    store.act(workspace, {
      ...base,
      action: { type: "accept", terms },
      sender: "seller",
      text: acceptMessage("seller", terms),
      listingStatus: "active",
      expectedVersion: 1,
      messageId: randomUUID(),
    });

    const scenarios = pickupScenarios(
      terms,
      new Date(pickup + 86400000).toISOString(),
      conversation.id,
    );
    const command = (step: PickupStep, version: number, time: number) => ({
      ...base,
      sender: step.actor,
      text: step.body,
      action: step.action,
      expectedVersion: version,
      demoNow: new Date(time).toISOString(),
      listingStatus: "reserved",
      messageId: randomUUID(),
    });
    let version = 2;
    const late = command(scenarios.handling[1], version, pickup - 181 * 60000);
    assert.throws(() => store.actPickup(workspace, late), {
      code: "too_early",
    });
    assert.throws(
      () =>
        store.actPickup(workspace, {
          ...late,
          action: { type: "late", minutes: 11 },
        }),
      { code: "minutes_invalid" },
    );
    const snapshot = () =>
      store.list(workspace).find((thread) => thread.id === conversation.id)!;
    assert.equal(snapshot().messages.length, version);
    for (const step of scenarios.overdue) {
      const input = command(step, version, pickup + 20 * 60000);
      const result = store.actPickup(workspace, input);
      assert.equal(result.conversation.deal?.version, ++version);
      assert.equal(
        result.conversation.messages.at(-1)?.pickupEvent?.kind,
        step.kind,
      );
      assert.deepEqual(store.actPickup(workspace, input), result);
      assert.throws(
        () => store.actPickup(workspace, { ...input, text: "Something else." }),
        { code: "message_conflict" },
      );
    }
    assert.equal(snapshot().messages.length, version);
    assert.equal(snapshot().deal?.outcome?.kind, "no_show");
    const followUp = {
      ...command(scenarios.nextBuyer, 0, pickup + 20 * 60000),
      buyerKey,
      listingStatus: "active",
    };
    assert.throws(() => store.actPickup(randomUUID(), followUp), {
      code: "NO_CONVERSATION",
    });
    assert.throws(
      () => store.actPickup(workspace, { ...followUp, expectedVersion: 1 }),
      { code: "deal_changed" },
    );
    assert.equal(
      store.actPickup(workspace, followUp).conversation.id,
      other.id,
    );
    assert.equal(snapshot().messages.length, version);
  } finally {
    store.close();
  }
});
