import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createMessagesStore } from "./messages.ts";
import { listingPhotoSources } from "../shared/listingPhotoSources.ts";

test("messages preserve marketplace photo URLs without rejecting a short draft", () => {
  const store = createMessagesStore(":memory:");
  try {
    const workspace = randomUUID();
    const image = listingPhotoSources.bike.image;
    const conversation = store.send(workspace, {
      listingId: "demo-v2-1",
      title: "City bicycle",
      seller: "Demo seller",
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
