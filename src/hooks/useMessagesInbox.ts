import { useMemo, useState } from "react";
import type { AccountConnection } from "../cloud/AccountSession";
import { useAccountAutoRead } from "../cloud/useAccountAutoRead";
import { useAccountInbox } from "../cloud/useAccountInbox";
import {
  accountInboxThread,
  demoInboxThread,
  inboxBadge,
  pickupActivity,
  unreadCount,
} from "../inboxActivity";
import type { PakoAvailability } from "./usePakoThread";
import { useDemoInbox } from "./useDemoInbox";
import { useSaved } from "./useSaved";
import { useThreadReads } from "./useThreadReads";
import { useNow } from "./useNow";

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

/**
 * Everything Messages needs for the whole app: the inbox of the mode the app
 * runs in, how many conversations have news for the badge, and how Pako may
 * read replies. With an account, unread counts and Pako's readings wait for
 * the server's update and say so.
 */
export function useMessagesInbox({
  account,
  open,
  aiConfigured,
}: {
  account: AccountConnection | undefined;
  /** The Messages page is on screen. */
  open: boolean;
  /** Whether the AI is set up; unknown until the connection check answers. */
  aiConfigured: boolean | undefined;
}) {
  const userId = account?.session?.user.id;
  const client = account?.client;
  const connection = useMemo(
    () => (client && userId ? { client, userId } : null),
    [client, userId],
  );
  const demoInbox = useDemoInbox({ enabled: !account, open });
  const reads = useThreadReads();
  const accountInbox = useAccountInbox(connection, open);
  const accountAutoRead = useAccountAutoRead(connection);
  const [demoAutoRead, setDemoAutoRead] = useSaved<boolean>(
    "takeover-pako-auto-read",
    true,
    isBoolean,
  );
  const [remaining, setRemaining] = useState<number>();
  const rows = accountInbox.rows;
  const now = useNow(!account);
  const missing =
    rows?.reads === null || accountAutoRead.state.status === "missing";
  const available: PakoAvailability =
    aiConfigured === false
      ? "unconfigured"
      : account && missing
        ? "missing"
        : "ready";
  const threads = !account ? demoInbox.conversations.map(demoInboxThread)
    : rows?.reads && userId ? rows.threads.map((thread) =>
      accountInboxThread(thread.id, rows.latest[thread.id], userId, rows.systemLatest[thread.id]),
    ) : [];
  const markers = account ? rows?.reads ?? {} : reads.reads;
  const activityByConversation: Record<string, ReturnType<typeof pickupActivity>> = {};
  const pickupReadKeys = new Set<string>();
  if (!account) {
    for (const { id, deal } of demoInbox.conversations) {
      const activity = pickupActivity(deal, "buyer", now);
      activityByConversation[id] = activity;
      if (activity.needsYou) pickupReadKeys.add(id + ":buyer");
    }
  } else if (rows && userId) {
    for (const thread of rows.threads) {
      const deal = rows.deals?.[thread.id];
      const other = thread.buyer_id === userId ? thread.seller_id : thread.buyer_id;
      if (!deal?.pickup || rows.archived.includes(thread.id) || rows.blocked.includes(other))
        continue;
      const activity = pickupActivity(deal, thread.buyer_id === userId ? "buyer" : "seller", now);
      activityByConversation[thread.id] = activity;
      if (activity.needsYou) pickupReadKeys.add(thread.id);
    }
  }
  return {
    deals: account
      ? Object.values(rows?.deals ?? {})
      : demoInbox.conversations.flatMap(thread => thread.deal ? [thread.deal] : []),
    demoInbox,
    reads,
    accountInbox,
    /** Conversations with news or pickup actions, for the Messages badge. */
    unread: inboxBadge(threads, markers, pickupReadKeys),
    messageUnread: unreadCount(threads, markers),
    pickupActivity: activityByConversation,
    now,
    available,
    // Until an account's choice has loaded, Pako waits for a tap.
    autoRead: account
      ? accountAutoRead.state.status === "ready" &&
        accountAutoRead.state.autoRead
      : demoAutoRead,
    remaining,
    setRemaining,
    setAutoRead: account
      ? accountAutoRead.setAutoRead
      : async (next: boolean) => setDemoAutoRead(next),
    /** Why the reading setting cannot change yet. */
    autoReadUnavailable:
      account && accountAutoRead.state.status === "missing"
        ? "I can't read replies here yet. You can still write your own."
        : accountAutoRead.state.status === "error"
          ? accountAutoRead.state.message
          : undefined,
  };
}
