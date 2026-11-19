import assert from "node:assert/strict";
import test from "node:test";
import { listMessages, resetMessageWorkspace } from "./messages.ts";

test("reset starts a fresh inbox and rejects old workspace responses", async (t) => {
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
