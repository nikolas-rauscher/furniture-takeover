import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  listMessages,
  resetMessageWorkspace,
  sendMessage,
} from "./messages.ts";

/** A localStorage kept in memory for one test. */
function useMemoryStorage(t: TestContext) {
  const stored = new Map<string, string>();
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    },
  });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
}

test("reset starts a fresh inbox and rejects old workspace responses", async (t) => {
  useMemoryStorage(t);
  const ids: string[] = [];
  let release!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (_path: string, init: RequestInit) => {
      ids.push(new Headers(init.headers).get("X-Message-Workspace")!);
      return ids.length === 1 ? pending : Response.json({ conversations: [] });
    },
  );
  const old = listMessages();
  resetMessageWorkspace();
  assert.deepEqual(await listMessages(), []);
  release(Response.json({ conversations: [{ id: "old" }] }));
  await assert.rejects(old, /demo conversation changed/);
  await listMessages();
  assert.notEqual(ids[0], ids[1]);
  assert.equal(ids[1], ids[2]);
});

test("a plain reply names the buyer whose thread it belongs to", async (t) => {
  useMemoryStorage(t);
  const bodies: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_path: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return Response.json({ conversation: { id: "second" } });
    },
  );
  const buyerKey = "22222222-2222-4222-8222-222222222222";
  await sendMessage(
    { id: "desk", title: "Desk", seller: "Léa", buyerKey },
    "Sure, Thursday works.",
    "seller",
  );
  assert.equal((bodies[0] as { buyerKey: string }).buyerKey, buyerKey);
});
