import type { Deal } from "../../shared/deal";
import type { SellerConversation } from "../../shared/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, Message } from "../cloud/client";
import type { PakoTurnCache } from "../pakoTurnCache";

type Markers = Record<string, string>;
export type InboxRows = {
  deals: Record<string, Deal> | null;
  systemLatest: Record<
    string,
    { sender_id: string | null; created_at: string }
  >;
  threads: Conversation[];
  latest: Record<string, Message>;
  archived: string[];
  blocked: string[];
  names: Record<string, string>;
  /** Null while the server lacks the update that keeps read markers. */
  reads: Markers | null;
};

type DraftsApi = { draftCache: (key: string) => PakoTurnCache };
export type DemoInboxApi = DraftsApi & {
  load: () => Promise<SellerConversation[]>;
  send: (
    listing: Pick<SellerConversation, "title" | "seller" | "image"> & {
      id: string;
    },
    text: string,
    sender: "buyer" | "seller",
    messageId: string,
  ) => Promise<SellerConversation>;
  archive: (id: string, remove: boolean) => Promise<SellerConversation>;
};

export type AutoReadPreference =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; autoRead: boolean };

export type AccountInboxApi = DraftsApi & {
  userId: string;
  load: () => Promise<InboxRows>;
  subscribe: (refresh: () => void) => () => void;
  markRead: (id: string, seenUpTo: string) => Promise<void>;
  loadAutoRead: () => Promise<AutoReadPreference>;
  setAutoRead: (autoRead: boolean) => Promise<void>;
  start: (listingId: string) => Promise<Conversation>;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  subscribeMessages: (
    conversationId: string,
    refresh: () => void,
  ) => () => void;
  send: (
    message: Pick<Message, "id" | "conversation_id" | "sender_id" | "body">,
  ) => Promise<Message>;
  archive: (id: string, remove: boolean) => Promise<void>;
  unarchiveAfterSend: (id: string) => Promise<void>;
  block: (userId: string, remove: boolean) => Promise<void>;
};

export type DemoInbox = {
  conversations: SellerConversation[];
  refresh: () => Promise<void>;
  loaded: boolean;
  error: string;
  reset: () => Promise<void>;
  put: (conversation: SellerConversation) => void;
  remove: (id: string) => void;
};

export type ThreadReads = {
  reads: Markers;
  markRead: (readKey: string, seenUpTo: string) => void;
};

export type AccountInbox = {
  rows: InboxRows | null;
  loadError: string;
  readError: string;
  refresh: () => Promise<void>;
  change: (update: (rows: InboxRows) => InboxRows) => void;
  markRead: (id: string, seenUpTo: string) => Promise<void>;
};

export type InboxView =
  | { mode: "demo"; inbox: DemoInbox; reads: ThreadReads; source: DemoInboxApi }
  | {
      mode: "account";
      inbox: AccountInbox;
      client: SupabaseClient;
      source: AccountInboxApi;
    }
  | { mode: "signed-out" };
