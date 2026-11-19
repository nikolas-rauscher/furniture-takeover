import { useMemo, useState } from "react";
import type { AccountConnection } from "../cloud/AccountSession";
import { useAccountAutoRead } from "../cloud/useAccountAutoRead";
import { useAccountInbox } from "../cloud/useAccountInbox";
import {
  accountInboxThread,
  demoInboxThread,
  unreadCount,
} from "../inboxActivity";
import type { PakoAvailability } from "./usePakoThread";
import { useDemoInbox } from "./useDemoInbox";
import { useSaved } from "./useSaved";
import { useThreadReads } from "./useThreadReads";

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
  const missing =
    rows?.reads === null || accountAutoRead.state.status === "missing";
  const available: PakoAvailability =
    aiConfigured === false
      ? "unconfigured"
      : account && missing
        ? "missing"
        : "ready";
  const unread = !account
    ? unreadCount(demoInbox.conversations.map(demoInboxThread), reads.reads)
    : rows?.reads && userId
      ? unreadCount(
          rows.threads.map((thread) =>
            accountInboxThread(thread.id, rows.latest[thread.id], userId),
          ),
          rows.reads,
        )
      : 0;
  return {
    demoInbox,
    reads,
    accountInbox,
    /** Conversations with news from the other student, for the Messages badge. */
    unread,
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
        ? "Available once this server has its reply reading update."
        : accountAutoRead.state.status === "error"
          ? accountAutoRead.state.message
          : undefined,
  };
}
