import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadInbox } from "./accountInbox.ts";

type Result = { data?: unknown[]; error?: { code: string; message: string } };

/** A query that answers every chained call with the same rows, like PostgREST would. */
function query(result: Result) {
  const builder = {
    select: () => builder,
    order: () => builder,
    is: () => builder,
    limit: () => builder,
    in: () => builder,
    then: (resolve: (value: unknown) => void) =>
      resolve({ data: result.data ?? null, error: result.error ?? null }),
  };
  return builder;
}

const me = "11111111-1111-4111-8111-111111111111";
const tables = (reads: Result): Record<string, Result> => ({
  deals: { data: [] },
  deal_events: { data: [] },
  conversations: {
    data: [
      {
        id: "c1",
        listing_id: "l1",
        buyer_id: me,
        seller_id: "s1",
        created_at: "2026-11-19T10:00:00Z",
      },
    ],
  },
  conversation_archives: { data: [] },
  blocked_users: { data: [] },
  messages: {
    data: [
      {
        id: "m1",
        conversation_id: "c1",
        sender_id: "s1",
        body: "Hi!",
        created_at: "2026-11-19T12:00:00Z",
      },
    ],
  },
  profiles: { data: [{ id: "s1", display_name: "Léa" }] },
  conversation_reads: reads,
});
const clientWith = (rows: Record<string, Result>) =>
  ({
    from: (table: string) => query(rows[table]),
    rpc: (name: string) =>
      name === "inbox_latest_messages"
        ? query(rows.messages)
        : Promise.resolve({ error: null }),
  }) as unknown as SupabaseClient;

test("without the reply reading update the inbox still loads, and says read markers are missing", async () => {
  const inbox = await loadInbox(
    clientWith(
      tables({
        error: {
          code: "PGRST205",
          message:
            "Could not find the table 'public.conversation_reads' in the schema cache",
        },
      }),
    ),
  );
  assert.equal(inbox.reads, null);
  assert.equal(inbox.threads.length, 1);
  assert.equal(inbox.latest.c1.body, "Hi!");
  assert.deepEqual(inbox.names, { s1: "Léa" });
});

test("with the update the inbox carries each read marker, and other failures stay errors", async () => {
  const inbox = await loadInbox(
    clientWith(
      tables({
        data: [
          { conversation_id: "c1", last_read_at: "2026-11-19T12:00:00+00:00" },
        ],
      }),
    ),
  );
  assert.deepEqual(inbox.reads, { c1: "2026-11-19T12:00:00+00:00" });
  await assert.rejects(
    loadInbox(
      clientWith(
        tables({ error: { code: "42501", message: "permission denied" } }),
      ),
    ),
    /permission denied/,
  );
});

test("a missing deal migration leaves ordinary conversations readable", async () => {
  const rows = tables({ data: [] });
  rows.deals = {
    error: { code: "PGRST205", message: "Table deals is missing" },
  };
  const inbox = await loadInbox(clientWith(rows));
  assert.equal(inbox.deals, null);
  assert.equal(inbox.latest.c1.body, "Hi!");
});
