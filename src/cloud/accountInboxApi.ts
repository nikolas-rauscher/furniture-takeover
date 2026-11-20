import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountInboxApi } from "../api/inbox.ts";
import { loadInbox } from "./accountInbox.ts";
import {
  fail,
  missingFromSchema,
  type Conversation,
  type Message,
} from "./client.ts";
import { sendCloudMessage } from "./messages.ts";
import { accountTurnCache } from "./pakoDrafts.ts";

async function loadMessages(client: SupabaseClient, conversationId: string) {
  const pageSize = 500;
  const rows: Message[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .order("id")
      .range(from, from + pageSize - 1);
    fail(result.error);
    rows.push(...(result.data as Message[]));
    if (result.data!.length < pageSize) return rows;
  }
}

export function createAccountInboxApi(
  client: SupabaseClient,
  userId: string,
): AccountInboxApi {
  const unarchive = (id: string) =>
    client
      .from("conversation_archives")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", userId);

  return {
    userId,
    load: () => loadInbox(client),
    subscribe(refresh) {
      const channel = client
        .channel(`account-inbox-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "conversations" },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "deals" },
          refresh,
        )
        .subscribe();
      return () => void client.removeChannel(channel);
    },
    async markRead(id, seenUpTo) {
      fail(
        (
          await client.from("conversation_reads").upsert({
            conversation_id: id,
            user_id: userId,
            last_read_at: seenUpTo,
          })
        ).error,
      );
    },
    async loadAutoRead() {
      const { data, error } = await client
        .from("account_preferences")
        .select("pako_auto_read")
        .eq("user_id", userId)
        .maybeSingle();
      if (missingFromSchema(error)) return { status: "missing" };
      if (error) return { status: "error", message: error.message };
      return { status: "ready", autoRead: data?.pako_auto_read ?? true };
    },
    async setAutoRead(autoRead) {
      fail(
        (
          await client.from("account_preferences").upsert({
            user_id: userId,
            pako_auto_read: autoRead,
          })
        ).error,
      );
    },
    async start(listingId) {
      const result = await client.rpc("start_conversation", {
        item: listingId,
      });
      fail(result.error);
      const conversation = await client
        .from("conversations")
        .select("*")
        .eq("id", result.data)
        .single();
      fail(conversation.error);
      return conversation.data as Conversation;
    },
    loadMessages: (id) => loadMessages(client, id),
    subscribeMessages(id, refresh) {
      const channel = client
        .channel(`account-thread-${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${id}`,
          },
          refresh,
        )
        .subscribe();
      return () => void client.removeChannel(channel);
    },
    send: (message) => sendCloudMessage(client, message),
    async archive(id, remove) {
      const result = remove
        ? await client
            .from("conversation_archives")
            .insert({ conversation_id: id, user_id: userId })
        : await unarchive(id);
      if (result.error?.code !== "23505") fail(result.error);
    },
    async unarchiveAfterSend(id) {
      const { error } = await unarchive(id);
      if (error) console.error(error);
    },
    async block(other, remove) {
      const result = remove
        ? await client
            .from("blocked_users")
            .delete()
            .eq("user_id", userId)
            .eq("blocked_id", other)
        : await client
            .from("blocked_users")
            .insert({ user_id: userId, blocked_id: other });
      if (result.error?.code !== "23505") fail(result.error);
    },
    draftCache: (key) => accountTurnCache(client, userId, key),
  };
}
