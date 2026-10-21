import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PendingMessage } from "./pendingMessage.ts";
import { createMessagesStore } from "../server/messages.ts";

test("lost responses retry once, but acknowledged identical messages are new deliveries", () => {
  const store = createMessagesStore(":memory:");
  const pending = new PendingMessage();
  const workspace = randomUUID();
  const input = {
    listingId: "desk",
    title: "Desk",
    seller: "Seller",
    sender: "buyer" as const,
    text: "Hello",
  };
  const id = () => pending.idFor(input.listingId, input.sender, input.text);
  try {
    const firstId = id();
    store.send(workspace, { ...input, messageId: firstId });
    // The server saved the first delivery, but its response did not arrive.
    assert.equal(id(), firstId);
    assert.equal(
      store.send(workspace, { ...input, messageId: id() }).messages.length,
      1,
    );
    pending.acknowledge(firstId);
    const secondId = id();
    assert.notEqual(secondId, firstId);
    assert.equal(
      store.send(workspace, { ...input, messageId: secondId }).messages.length,
      2,
    );
  } finally {
    store.close();
  }
});

test("delivery identity separates recipients, sender roles and changed text", () => {
  const pending = new PendingMessage();
  const ids = [
    pending.idFor("desk", "buyer", "Hello"),
    pending.idFor("chair", "buyer", "Hello"),
    pending.idFor("chair", "seller", "Hello"),
    pending.idFor("chair", "seller", "Goodbye"),
  ];
  assert.equal(new Set(ids).size, 4);
  pending.acknowledge(ids[0]);
  assert.equal(pending.idFor("chair", "seller", "Goodbye"), ids[3]);
});
