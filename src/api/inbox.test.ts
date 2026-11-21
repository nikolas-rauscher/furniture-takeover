import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { threadTurnSchema, type ThreadTurn } from "../../shared/threadTurn.ts";
import { createAccountInboxApi } from "../cloud/accountInboxApi.ts";
import type { PakoTurnCache } from "../pakoTurnCache.ts";
import { demoInboxApi } from "./demoInbox.ts";

function demoDrafts(t: TestContext) {
  const storage = new Map<string, string>();
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
    },
  });
  t.after(() => {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
  return demoInboxApi.draftCache;
}

function accountDrafts() {
  type Row = {
    conversation_id: string;
    user_id: string;
    for_message_id: string;
    turn: ThreadTurn;
  };
  const rows = new Map<string, Row>();
  const client = {
    from(table: string) {
      assert.equal(table, "pako_drafts");
      return {
        select: () => ({
          eq(column: string, id: string) {
            assert.equal(column, "conversation_id");
            return {
              maybeSingle: async () => ({
                data: rows.get(id) ?? null,
                error: null,
              }),
            };
          },
        }),
        async upsert(row: Row) {
          assert.equal(row.user_id, "buyer");
          rows.set(row.conversation_id, row);
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;
  return createAccountInboxApi(client, "buyer").draftCache;
}

function reading(forMessageId: string) {
  return threadTurnSchema.parse({
    forMessageId,
    summary: "{other} offers CHF 40.",
    language: "en",
    stance: "offer",
    facts: {},
    pickupAt: null,
    agreement: { status: "none", missing: [] },
    options: [
      {
        id: "opt-1",
        label: "Accept",
        kind: "accept",
        message: "Deal at CHF 40!",
        terms: null,
      },
    ],
  });
}

const drafts: Record<
  string,
  (t: TestContext) => (key: string) => PakoTurnCache
> = { demo: demoDrafts, account: accountDrafts };

for (const [mode, setup] of Object.entries(drafts)) {
  test(`${mode} inbox stores the latest Pako draft separately per thread`, async (t) => {
    const cache = setup(t);
    assert.equal(await cache("one").load(), null);
    await cache("one").save(reading("m1"));
    await cache("two").save(reading("m2"));
    await cache("one").save(reading("m3"));
    assert.deepEqual(await cache("one").load(), reading("m3"));
    assert.deepEqual(await cache("two").load(), reading("m2"));
  });
}
