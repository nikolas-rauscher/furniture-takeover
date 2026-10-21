import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createMessagesStore } from "./messages.ts";
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
