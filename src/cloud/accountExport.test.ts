import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { accountExport } from "./accountExport.ts";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "student@epfl.ch",
  created_at: "2026-11-01T10:00:00Z",
} as User;

/** Serves each table's rows one requested range at a time, like PostgREST. */
function pagedClient(rows: Record<string, unknown[]>) {
  return {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        range: async (from: number, to: number) => ({
          data: (rows[table] ?? []).slice(from, to + 1),
          error: null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

test("the export pages through long histories and includes deal records", async () => {
  const messages = Array.from({ length: 1001 }, (_, index) => ({ id: index }));
  const data = await accountExport(
    pagedClient({
      messages,
      deals: [{ conversation_id: "c1" }],
      deal_events: [{ id: "e1", kind: "picked_up" }],
    }),
    user,
  );
  assert.equal((data.messages as unknown[]).length, 1001);
  assert.deepEqual(data.deals, [{ conversation_id: "c1" }]);
  assert.deepEqual(data.deal_events, [{ id: "e1", kind: "picked_up" }]);
  assert.deepEqual(data.account, {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  });
});
