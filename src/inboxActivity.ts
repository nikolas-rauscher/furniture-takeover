import type { SellerConversation } from "../shared/messages.ts";

/** A conversation in the inbox, reduced to who wrote last and when. */
export type InboxThread = {
  /** The key the student's read marker is stored under. */
  readKey: string;
  latest?: { from: "me" | "them"; at: string };
};

/** Whether the other student wrote after the student last read the thread. */
export function isUnread(
  thread: InboxThread,
  reads: Readonly<Record<string, string>>,
): boolean {
  if (thread.latest?.from !== "them") return false;
  const readUpTo = reads[thread.readKey];
  return (
    readUpTo === undefined ||
    Date.parse(thread.latest.at) > Date.parse(readUpTo)
  );
}

/** How many conversations have news for the student, for the Messages badge. */
export const unreadCount = (
  threads: readonly InboxThread[],
  reads: Readonly<Record<string, string>>,
) => threads.filter((thread) => isUnread(thread, reads)).length;

/**
 * The read marker to store once the student has seen a thread up to a
 * message: markers only move forward, so an older view saves nothing.
 */
export function nextReadMarker(
  stored: string | undefined,
  seenUpTo: string,
): string | undefined {
  return stored === undefined || Date.parse(seenUpTo) > Date.parse(stored)
    ? seenUpTo
    : undefined;
}

/** A local conversation from the student's side: in the local demo the student is the buyer. */
export function demoInboxThread(conversation: SellerConversation): InboxThread {
  const latest = conversation.messages.at(-1);
  return {
    readKey: `${conversation.id}:buyer`,
    latest: latest && {
      from: latest.sender === "buyer" ? "me" : "them",
      at: latest.createdAt,
    },
  };
}

/** An account conversation from the signed-in student's side, by its newest message. */
export function accountInboxThread(
  conversationId: string,
  latest: { sender_id: string; created_at: string } | undefined,
  userId: string,
): InboxThread {
  return {
    readKey: conversationId,
    latest: latest && {
      from: latest.sender_id === userId ? "me" : "them",
      at: latest.created_at,
    },
  };
}
