import {readDeal} from "./deals.ts";
import type {Deal} from "../../shared/deal.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, Message } from "./client.ts";
import { fail, missingFromSchema } from "./client.ts";

export type InboxRows = {
  deals:Record<string,Deal>|null;
  threads: Conversation[];
  /** The newest message of each conversation. */
  latest: Record<string, Message>;
  archived: string[];
  blocked: string[];
  names: Record<string, string>;
  /** How far the student has read each conversation; null while the server lacks the update that keeps read markers. */
  reads: Record<string, string> | null;
};

/** One load of the inbox: conversations, their newest messages, archives, blocks, names and read markers. */
export async function loadInbox(client: SupabaseClient): Promise<InboxRows> {
  const [cs, as, bs, ms, rs, ds] = await Promise.all([
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
  ]);
  if(!missingFromSchema(ds.error))fail(ds.error);
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
  return {
    deals:ds.error?null:Object.fromEntries((ds.data??[]).map(r=>[r.conversation_id,readDeal(r)])),
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
