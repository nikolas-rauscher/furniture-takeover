import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AgentError } from "./errors.ts";
import type { SellerConversation, ChatMessage } from "../shared/messages.ts";

const inputSchema = z
  .object({
    listingId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180),
    seller: z.string().trim().min(1).max(120),
    image: z
      .string()
      .max(750000)
      .regex(
        /^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|\/images\/[A-Za-z0-9_.-]+)$/,
      )
      .optional(),
    text: z.string().trim().min(1).max(4000),
    sender: z.enum(["buyer", "seller"]),
    messageId: z.string().uuid(),
  })
  .strict();
/** Local prototype workspace only. Seller mode is a preview, not authentication. */
export function createMessagesStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, workspace TEXT NOT NULL, listing_id TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(workspace, listing_id))",
  );
  const list = (workspace: string): SellerConversation[] =>
    db
      .prepare(
        "SELECT payload FROM conversations WHERE workspace = ? ORDER BY rowid DESC",
      )
      .all(workspace)
      .map((row) => JSON.parse(String(row.payload)))
      .filter((item) => !item.deletedAt);
  return {
    list,
    setDeleted(
      workspace: string,
      input: unknown,
      deleted: boolean,
    ): SellerConversation {
      const parsed = z
        .object({ id: z.string().uuid() })
        .strict()
        .safeParse(input);
      if (!parsed.success)
        throw new AgentError(
          400,
          "INVALID_CONVERSATION",
          "Choose a conversation.",
        );
      const row = db
        .prepare(
          "SELECT payload FROM conversations WHERE workspace = ? AND id = ?",
        )
        .get(workspace, parsed.data.id);
      if (!row)
        throw new AgentError(404, "NO_CONVERSATION", "Conversation not found.");
      const conversation: SellerConversation = JSON.parse(String(row.payload));
      if (deleted) conversation.deletedAt = new Date().toISOString();
      else delete conversation.deletedAt;
      db.prepare(
        "UPDATE conversations SET payload = ? WHERE workspace = ? AND id = ?",
      ).run(JSON.stringify(conversation), workspace, conversation.id);
      return conversation;
    },
    send(workspace: string, input: unknown): SellerConversation {
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success)
        throw new AgentError(
          400,
          "INVALID_MESSAGE",
          "Enter a message of up to 4,000 characters.",
        );
      const value = parsed.data;
      db.exec("BEGIN IMMEDIATE");
      try {
        const row = db
          .prepare(
            "SELECT payload FROM conversations WHERE workspace = ? AND listing_id = ?",
          )
          .get(workspace, value.listingId);
        if (!row && value.sender === "seller")
          throw new AgentError(
            400,
            "NO_CONVERSATION",
            "Start a buyer conversation first.",
          );
        const conversation: SellerConversation = row
          ? JSON.parse(String(row.payload))
          : {
              id: randomUUID(),
              listingId: value.listingId,
              title: value.title,
              seller: value.seller,
              messages: [],
            };
        if (conversation.deletedAt) conversation.messages = [];
        delete conversation.deletedAt;
        if (value.image) conversation.image = value.image;
        if (
          !conversation.messages.some(
            (message) => message.id === value.messageId,
          )
        ) {
          const message: ChatMessage = {
            id: value.messageId,
            sender: value.sender,
            text: value.text,
            createdAt: new Date().toISOString(),
          };
          conversation.messages.push(message);
          db.prepare(
            "INSERT INTO conversations (id, workspace, listing_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT(workspace, listing_id) DO UPDATE SET payload = excluded.payload",
          ).run(
            conversation.id,
            workspace,
            value.listingId,
            JSON.stringify(conversation),
          );
        }
        db.exec("COMMIT");
        return conversation;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close: () => db.close(),
  };
}
export type MessagesStore = ReturnType<typeof createMessagesStore>;
