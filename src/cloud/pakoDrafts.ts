import type { SupabaseClient } from "@supabase/supabase-js";
import { threadTurnSchema } from "../../shared/threadTurn.ts";
import type { PakoTurnCache } from "../pakoTurnCache.ts";
import { fail } from "./client.ts";

/** With an account, Pako's latest reading of a conversation is the student's private row. */
export function accountTurnCache(
  client: SupabaseClient,
  userId: string,
  conversationId: string,
): PakoTurnCache {
  return {
    async load() {
      const result = await client
        .from("pako_drafts")
        .select("for_message_id, turn")
        .eq("conversation_id", conversationId)
        .maybeSingle();
      fail(result.error);
      if (!result.data) return null;
      const parsed = threadTurnSchema.safeParse(result.data.turn);
      if (
        !parsed.success ||
        parsed.data.forMessageId !== result.data.for_message_id
      )
        throw new Error(
          "I couldn't load my earlier suggestions. Read the reply again to get new ones.",
        );
      return parsed.data;
    },
    async save(turn) {
      fail(
        (
          await client.from("pako_drafts").upsert({
            conversation_id: conversationId,
            user_id: userId,
            for_message_id: turn.forMessageId,
            turn,
          })
        ).error,
      );
    },
  };
}
