import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fail } from "./client.ts";

const PAGE_ROWS = 1000;

/** Each exported table with the columns that give it a stable order for paging. */
const EXPORTED_TABLES = {
  profiles: "id",
  account_preferences: "user_id",
  saved_listings: "user_id,listing_id",
  blocked_users: "user_id,blocked_id",
  reports: "id",
  conversations: "id",
  messages: "id",
  deals: "conversation_id",
  deal_events: "id",
  listings: "id",
} as const;
type ExportedTable = keyof typeof EXPORTED_TABLES;
/** Tables that also hold other students' rows the student can read, narrowed to their own. */
type OwnRows = Partial<Record<ExportedTable, [column: string, id: string]>>;

/** Every row the student may read, page by page, so a long history is never cut short. */
async function readAll(
  client: SupabaseClient,
  table: ExportedTable,
  owner: OwnRows,
) {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += PAGE_ROWS) {
    let query = client.from(table).select("*");
    const filter = owner[table];
    if (filter) query = query.eq(...filter);
    for (const column of EXPORTED_TABLES[table].split(","))
      query = query.order(column);
    const page = await query.range(offset, offset + PAGE_ROWS - 1);
    fail(page.error);
    rows.push(...page.data!);
    if (page.data!.length < PAGE_ROWS) return rows;
  }
}

/** The student's account data as one JSON-ready object. */
export async function accountExport(client: SupabaseClient, user: User) {
  const owner: OwnRows = {
    profiles: ["id", user.id],
    listings: ["owner_id", user.id],
  };
  const data: Record<string, unknown> = {
    account: { id: user.id, email: user.email, created_at: user.created_at },
  };
  for (const table of Object.keys(EXPORTED_TABLES) as ExportedTable[])
    data[table] = await readAll(client, table, owner);
  return data;
}
