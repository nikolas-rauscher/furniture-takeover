import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  checkDemoContact,
  checkDemoStudent,
  initializeDemoModeration,
} from "./demo-admin.ts";
import { AgentError } from "./errors.ts";
import type { SellerConversation, ChatMessage } from "../shared/messages.ts";

import {
  applyDealAction,
  applyPickupAction,
  dealActionSchema,
  expirePickup,
  pickupCheck,
  DealError,
  isoInstantSchema,
  pickupActionSchema,
  reopenUnagreedDeal,
  type DealAction,
  type PickupAction,
  type PickupStatusChange,
} from "../shared/deal.ts";
import { dealErrorMessage } from "../shared/dealErrors.ts";
const inputSchema = z
  .object({
    buyerKey: z.string().uuid().optional(),
    listingId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180),
    seller: z.string().trim().min(1).max(120),
    image: z
      .string()
      .max(750000)
      .refine((image) => {
        if (
          /^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|\/(?:images|samples)\/[A-Za-z0-9_.-]+)$/.test(
            image,
          )
        )
          return true;
        if (image.length > 4096) return false;
        const url = URL.parse(image);
        return (
          url !== null &&
          url.protocol === "https:" &&
          !url.username &&
          !url.password
        );
      })
      .optional(),
    text: z.string().trim().min(1).max(4000),
    sender: z.enum(["buyer", "seller"]),
    messageId: z.string().uuid(),
  })
  .strict();
/** Local prototype workspace only. Seller mode is a preview, not authentication. */
/** A rejected deal or pickup input, named by the deal error of the field that broke. */
function invalidInput(error: z.ZodError, fallback: string, message: string) {
  const path = error.issues[0].path;
  const key =
    path[0] === "text"
      ? "message_invalid"
      : path.includes("terms")
        ? "terms_invalid"
        : path.includes("minutes")
          ? "minutes_invalid"
          : path.includes("reason")
            ? "reason_invalid"
            : path[0] === "action"
              ? "action_invalid"
              : undefined;
  return key
    ? new AgentError(400, key, dealErrorMessage(key))
    : new AgentError(400, fallback, message);
}

export function createMessagesStore(path: string, clock = () => new Date()) {
  const db = new DatabaseSync(path);
  initializeDemoModeration(db);
  db.exec(
    "CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, workspace TEXT NOT NULL, listing_id TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(workspace, listing_id))",
  );
  // Earlier installations enforced one buyer per listing. Preserve those threads as the default buyer.
  if (
    !db
      .prepare("pragma table_info(conversations)")
      .all()
      .some((c) => c.name === "buyer_key")
  ) {
    db.exec(`BEGIN IMMEDIATE;
      ALTER TABLE conversations RENAME TO old_conversations;
      CREATE TABLE conversations(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, listing_id TEXT NOT NULL,buyer_key TEXT NOT NULL DEFAULT '',payload TEXT NOT NULL, UNIQUE(workspace,listing_id,buyer_key));
      INSERT INTO conversations(id,workspace,listing_id,payload) SELECT id,workspace,listing_id,payload FROM old_conversations;
      DROP TABLE old_conversations;
      COMMIT;`);
  }
  const readConversation = (payload: unknown): SellerConversation => {
    const conversation: SellerConversation = JSON.parse(String(payload));
    if (conversation.deal)
      conversation.deal = reopenUnagreedDeal(conversation.deal);
    return conversation;
  };
  const readWorkspace = (workspace: string): SellerConversation[] =>
    db
      .prepare(
        "SELECT payload FROM conversations WHERE workspace = ? ORDER BY rowid DESC",
      )
      .all(workspace)
      .map((row) => readConversation(row.payload))
      .filter((item) => !item.deletedAt);
  function checkWorkspacePickups(
    workspace: string,
    now: Date,
  ): SellerConversation[] {
    const conversations = readWorkspace(workspace);
    for (const conversation of conversations) {
      const deal = conversation.deal;
      const check = pickupCheck(deal, now);
      if (!deal || !check) continue;
      const events = (conversation.systemEvents ??= []);
      const needsPrompt = !events.some(
        (event) =>
          event.kind === "pickup_check_due" && event.at === check.opensAt,
      );
      if (needsPrompt)
        events.push({ kind: "pickup_check_due", at: check.opensAt });
      if (check.expired) {
        conversation.deal = expirePickup(deal, check.expiresAt);
        events.push({ kind: "pickup_expired", at: check.expiresAt });
      }
      if (needsPrompt || check.expired)
        db.prepare("update conversations set payload=? where id=?").run(
          JSON.stringify(conversation),
          conversation.id,
        );
    }
    return conversations;
  }
  function list(workspace: string): SellerConversation[] {
    db.exec("BEGIN IMMEDIATE");
    try {
      const conversations = checkWorkspacePickups(workspace, clock());
      db.exec("COMMIT");
      return conversations;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const dealInput = inputSchema.extend({
    action: dealActionSchema,
    expectedVersion: z.number().int().nonnegative(),
    listingStatus: z.enum(["active", "reserved", "sold", "withdrawn"]),
  });
  const pickupInput = dealInput.extend({
    action: pickupActionSchema,
    demoNow: isoInstantSchema.optional(),
  });
  type Command = Pick<
    z.infer<typeof dealInput>,
    "listingStatus" | "expectedVersion"
  > &
    (
      | { pickup?: false; action: DealAction }
      | { pickup: true; action: PickupAction; demoNow?: string }
    );
  function append(
    workspace: string,
    value: z.infer<typeof inputSchema>,
    command?: Command,
  ) {
    db.exec("BEGIN IMMEDIATE");
    try {
      if (command) checkDemoStudent(db, workspace);
      const now = clock();
      const peers = checkWorkspacePickups(workspace, now);
      const row = db
        .prepare(
          "select payload from conversations where workspace=? and listing_id=? and buyer_key=?",
        )
        .get(workspace, value.listingId, value.buyerKey ?? "");
      const existing = row && readConversation(row.payload);
      if (
        (!existing || existing.deletedAt) &&
        (value.sender === "seller" ||
          (command && command.action.type !== "propose"))
      )
        throw new AgentError(
          400,
          "NO_CONVERSATION",
          "Start a buyer conversation first.",
        );
      const conversation: SellerConversation = existing ?? {
        id: randomUUID(),
        listingId: value.listingId,
        title: value.title,
        seller: value.seller,
        ...(value.buyerKey ? { buyerKey: value.buyerKey } : {}),
        messages: [],
      };
      if (conversation.deletedAt) {
        conversation.messages = [];
        delete conversation.deal;
        delete conversation.deletedAt;
        delete conversation.systemEvents;
      }
      const duplicate = peers.find((c) =>
        c.messages.some((m) => m.id === value.messageId),
      );
      if (!duplicate) checkDemoContact(db, workspace, value.listingId);
      let statusChange: "active" | "reserved" | "sold" | undefined;
      let pickupStatusChange: PickupStatusChange | undefined;
      if (duplicate) {
        const previous = duplicate.messages.find(
          (m) => m.id === value.messageId,
        )!;
        if (
          duplicate.id !== conversation.id ||
          previous.sender !== value.sender ||
          previous.text !== value.text ||
          Boolean(previous.deal) !== Boolean(command && !command.pickup) ||
          Boolean(previous.pickupEvent) !== Boolean(command?.pickup)
        )
          throw new DealError("message_conflict");
        if (command && conversation.messages.at(-1)?.id === previous.id) {
          if (
            previous.deal?.kind === "completed" &&
            conversation.deal?.status === "completed"
          )
            statusChange = "sold";
          if (
            previous.deal?.kind === "accepted" &&
            conversation.deal?.status === "agreed"
          )
            statusChange = "reserved";
          if (
            previous.deal?.kind === "cancelled" &&
            conversation.deal?.agreed &&
            !peers.some(
              (c) =>
                c.listingId === value.listingId && c.deal?.status === "agreed",
            )
          )
            statusChange = "active";
        }
        if (
          previous.pickupStatusChange === "sold" &&
          conversation.deal?.status === "completed"
        )
          pickupStatusChange = "sold";
        if (
          previous.pickupStatusChange === "active" &&
          conversation.deal?.status === "cancelled" &&
          !peers.some(
            (c) =>
              c.listingId === value.listingId &&
              (c.deal?.status === "agreed" || c.deal?.status === "completed"),
          )
        )
          pickupStatusChange = "active";
      } else {
        const message: ChatMessage = {
          id: value.messageId,
          text: value.text,
          sender: value.sender,
          createdAt: now.toISOString(),
        };
        if (command) {
          if ((conversation.deal?.version ?? 0) !== command.expectedVersion)
            throw new DealError("deal_changed");
          const others = peers.filter(
            (c) => c.listingId === value.listingId && c.id !== conversation.id,
          );
          const completed = peers.some(
            (c) =>
              c.listingId === value.listingId && c.deal?.status === "completed",
          );
          const expired =
            command.listingStatus === "reserved" &&
            peers.some(
              (c) =>
                c.listingId === value.listingId &&
                c.deal?.outcome?.kind === "pickup_expired",
            );
          const listingStatus = completed
            ? "sold"
            : peers.some(
                  (c) =>
                    c.listingId === value.listingId &&
                    c.deal?.status === "agreed",
                )
              ? "reserved"
              : expired
                ? "active"
                : command.listingStatus;
          const input = {
            deal: conversation.deal ?? null,
            actor: value.sender,
            body: value.text,
            conversationId: conversation.id,
            listingId: value.listingId,
            messageId: value.messageId,
            now,
            listingStatus,
          };
          if (command.pickup) {
            const { action } = command;
            const result = applyPickupAction({
              ...input,
              action,
              now: command.demoNow ? new Date(command.demoNow) : now,
              releasedDeal:
                action.type === "offer_again"
                  ? peers.find(
                      (peer) => peer.id === action.releasedConversationId,
                    )?.deal
                  : undefined,
            });
            conversation.deal = result.deal;
            message.pickupEvent = result.event;
            if (result.statusChange)
              message.pickupStatusChange = result.statusChange;
            pickupStatusChange = result.statusChange;
          } else {
            const result = applyDealAction({
              ...input,
              action: command.action,
            });
            conversation.deal = result.deal;
            message.deal = result.event;
            statusChange = result.statusChange;
          }
          if (statusChange === "reserved")
            for (const other of others) {
              if (other.deal?.status !== "open" || !other.deal.proposal)
                continue;
              other.deal = {
                ...other.deal,
                version: other.deal.version + 1,
                proposal: null,
                updatedAt: message.createdAt,
              };
              (other.systemEvents ??= []).push({
                kind: "superseded",
                at: message.createdAt,
              });
              db.prepare("update conversations set payload=? where id=?").run(
                JSON.stringify(other),
                other.id,
              );
            }
        }
        if (value.image) conversation.image = value.image;
        conversation.messages.push(message);
        db.prepare(
          "insert into conversations(id,workspace,listing_id,buyer_key,payload) values(?,?,?,?,?) on conflict(id) do update set payload=excluded.payload",
        ).run(
          conversation.id,
          workspace,
          value.listingId,
          value.buyerKey ?? "",
          JSON.stringify(conversation),
        );
      }
      db.exec("COMMIT");
      return { conversation, statusChange, pickupStatusChange };
    } catch (error) {
      db.exec("ROLLBACK");
      if (error instanceof DealError)
        throw new AgentError(409, error.key, dealErrorMessage(error.key));
      throw error;
    }
  }
  return {
    list,
    act(workspace: string, input: unknown) {
      const parsed = dealInput.safeParse(input);
      if (!parsed.success)
        throw invalidInput(
          parsed.error,
          "INVALID_DEAL",
          "Check the offer and try again.",
        );
      const { conversation, statusChange } = append(
        workspace,
        parsed.data,
        parsed.data,
      );
      return { conversation, statusChange };
    },
    actPickup(workspace: string, input: unknown) {
      const parsed = pickupInput.safeParse(input);
      if (!parsed.success)
        throw invalidInput(
          parsed.error,
          "INVALID_PICKUP",
          "Check the pickup details and try again.",
        );
      const { conversation, pickupStatusChange } = append(
        workspace,
        parsed.data,
        { ...parsed.data, pickup: true },
      );
      return { conversation, statusChange: pickupStatusChange };
    },
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
      if (deleted && conversation.deal?.status === "agreed")
        throw new AgentError(
          409,
          "deal_agreed",
          "Cancel the deal before deleting this conversation.",
        );
      if (deleted) conversation.deletedAt = new Date().toISOString();
      else delete conversation.deletedAt;
      db.prepare(
        "UPDATE conversations SET payload = ? WHERE workspace = ? AND id = ?",
      ).run(JSON.stringify(conversation), workspace, conversation.id);
      return conversation;
    },
    send(workspace: string, input: unknown): SellerConversation {
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success) {
        const invalidText = parsed.error.issues.some(
          (issue) => issue.path[0] === "text",
        );
        const invalidImage = parsed.error.issues.some(
          (issue) => issue.path[0] === "image",
        );
        throw new AgentError(
          400,
          "INVALID_MESSAGE",
          invalidText
            ? "Enter a message of up to 4,000 characters."
            : invalidImage
              ? "The listing photo could not be attached. Please use another photo."
              : "The listing details could not be sent. Please reopen the listing and try again.",
        );
      }
      return append(workspace, parsed.data).conversation;
    },
    close: () => db.close(),
  };
}
export type MessagesStore = ReturnType<typeof createMessagesStore>;
