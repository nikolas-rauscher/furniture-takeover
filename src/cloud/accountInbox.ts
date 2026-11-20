import { readDeal } from "./deals.ts";
import type { InboxRows } from "../api/inbox.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, Message } from "./client.ts";
import { fail, missingFromSchema } from "./client.ts";

export async function refreshPickupChecks(
  client: SupabaseClient,
  catalog = false,
) {
  const { error } = await client.rpc("refresh_pickup_checks", {
    p_catalog: catalog,
  });
  if (!missingFromSchema(error)) fail(error);
}

/** One load of the inbox: conversations, their newest messages, archives, blocks, names and read markers. */
export async function loadInbox(client: SupabaseClient): Promise<InboxRows> {
  await refreshPickupChecks(client);
  const [cs, as, bs, ms, rs, ds, es] = await Promise.all([
    client
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false }),
    client.from("conversation_archives").select("conversation_id"),
    client.from("blocked_users").select("blocked_id"),
    client
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    client.from("conversation_reads").select("conversation_id, last_read_at"),
    client.from("deals").select("*"),
    client
      .from("deal_events")
      .select("conversation_id,actor_role,created_at")
      .is("message_id", null)
      .order("created_at", { ascending: false }),
  ]);
  if (!missingFromSchema(ds.error)) fail(ds.error);
  if (!missingFromSchema(es.error)) fail(es.error);
  fail(cs.error);
  fail(as.error);
  fail(bs.error);
  fail(ms.error);
  if (!missingFromSchema(rs.error)) fail(rs.error);
  const latest: Record<string, Message> = {};
  for (const message of (ms.data ?? []) as Message[])
    latest[message.conversation_id] ??= message;
  const rows = cs.data as Conversation[],
    ids = [...new Set(rows.flatMap((c) => [c.buyer_id, c.seller_id]))];
  const profiles = ids.length
    ? await client.from("profiles").select("*").in("id", ids)
    : { data: [], error: null };
  fail(profiles.error);
  const byId = new Map(rows.map((thread) => [thread.id, thread]));
  const systemLatest: InboxRows["systemLatest"] = {};
  for (const event of es.data ?? []) {
    const thread = byId.get(event.conversation_id);
    if (thread)
      systemLatest[thread.id] ??= {
        sender_id:
          event.actor_role === "seller"
            ? thread.seller_id
            : event.actor_role === "buyer"
              ? thread.buyer_id
              : null,
        created_at: event.created_at,
      };
  }
  return {
    systemLatest,
    deals: ds.error
      ? null
      : Object.fromEntries(
          (ds.data ?? []).map((row) => [row.conversation_id, readDeal(row)]),
        ),
    threads: rows.sort((a, b) =>
      (latest[b.id]?.created_at ?? b.created_at).localeCompare(
        latest[a.id]?.created_at ?? a.created_at,
      ),
    ),
    latest,
    archived: as.data!.map((x) => x.conversation_id),
    blocked: bs.data!.map((x) => x.blocked_id),
    names: Object.fromEntries(
      (profiles.data ?? []).map((x) => [x.id, x.display_name]),
    ),
    reads: rs.error
      ? null
      : Object.fromEntries(
          (rs.data ?? []).map((read) => [
            read.conversation_id,
            read.last_read_at,
          ]),
        ),
  };
}
