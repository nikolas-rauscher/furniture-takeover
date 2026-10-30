import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "./client.ts";
import { fail } from "./client.ts";
/** Keep the same ID after an uncertain network result; never retry as a new message. */
export async function sendCloudMessage(
  client: SupabaseClient,
  message: Pick<Message, "id" | "conversation_id" | "sender_id" | "body">,
): Promise<Message> {
  const result = await client
    .from("messages")
    .insert(message)
    .select("*")
    .single();
  if (result.error?.code === "23505") {
    const existing = await client
      .from("messages")
      .select("*")
      .eq("id", message.id)
      .single();
    fail(existing.error);
    if (
      existing.data.sender_id !== message.sender_id ||
      existing.data.conversation_id !== message.conversation_id ||
      existing.data.body !== message.body
    )
      throw Error("This message could not be confirmed.");
    return existing.data as Message;
  }
  fail(result.error);
  return result.data as Message;
}
