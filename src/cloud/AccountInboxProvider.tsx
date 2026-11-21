import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountInboxApi,
  AutoReadPreference,
  InboxRows,
} from "../api/inbox";
import { InboxContext, useInboxOpen } from "../hooks/useMessagesInbox";
import { useNow } from "../hooks/useNow";
import { accountInboxThread, pickupActivity } from "../inboxActivity";
import { accountInboxDeals } from "../inboxDeals";
import { createAccountInboxApi } from "./accountInboxApi";
import { useAccountInbox } from "./useAccountInbox";

/** Until the preference loads, Pako waits for a tap. */
function useAutoRead(api: AccountInboxApi | null) {
  const [state, setState] = useState<AutoReadPreference>({ status: "loading" });
  useEffect(() => {
    if (!api) return;
    let alive = true;
    setState({ status: "loading" });
    void api.loadAutoRead().then(
      (next) => {
        if (alive) setState(next);
      },
      (error: unknown) => {
        if (alive)
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Couldn't load the reading setting.",
          });
      },
    );
    return () => {
      alive = false;
    };
  }, [api]);
  const setAutoRead = useCallback(
    async (autoRead: boolean) => {
      if (!api) throw new Error("Sign in to change this setting.");
      await api.setAutoRead(autoRead);
      setState({ status: "ready", autoRead });
    },
    [api],
  );
  return { state, setAutoRead };
}

function pickupKeys(
  rows: InboxRows | null,
  userId: string | undefined,
  now: Date,
) {
  const keys = new Set<string>();
  if (!rows || !userId) return keys;
  for (const thread of rows.threads) {
    const deal = rows.deals?.[thread.id];
    const buyer = thread.buyer_id === userId;
    const other = buyer ? thread.seller_id : thread.buyer_id;
    if (
      !deal?.pickup ||
      rows.archived.includes(thread.id) ||
      rows.blocked.includes(other)
    )
      continue;
    if (pickupActivity(deal, buyer ? "buyer" : "seller", now).needsYou)
      keys.add(thread.id);
  }
  return keys;
}

export function AccountInboxProvider({
  client,
  userId,
  children,
}: PropsWithChildren<{
  client: SupabaseClient;
  userId?: string;
}>) {
  const api = useMemo(
    () => (userId ? createAccountInboxApi(client, userId) : null),
    [client, userId],
  );
  const [open, setOpen] = useInboxOpen();
  const inbox = useAccountInbox(api, open);
  const { rows } = inbox;
  const { state, setAutoRead } = useAutoRead(api);
  const now = useNow();
  const threads =
    rows?.reads && userId
      ? rows.threads.map(({ id }) =>
          accountInboxThread(
            id,
            rows.latest[id],
            userId,
            rows.systemLatest[id],
          ),
        )
      : [];
  return (
    <InboxContext
      value={{
        screen: api
          ? { mode: "account", inbox, client, source: api }
          : { mode: "signed-out" },
        scope: userId ?? "",
        loaded: rows !== null,
        settled: !api || rows !== null || inbox.loadError !== "",
        deals: Object.values(rows?.deals ?? {}),
        items: rows && userId ? accountInboxDeals(rows, userId) : [],
        threads,
        markers: rows?.reads ?? {},
        pickupReadKeys: pickupKeys(rows, userId, now),
        now,
        autoRead: state.status === "ready" && state.autoRead,
        pakoMissing: rows?.reads === null || state.status === "missing",
        autoReadUnavailable:
          state.status === "missing"
            ? "I can't read replies here yet. You can still write your own."
            : state.status === "error"
              ? state.message
              : undefined,
        setAutoRead,
        refresh: inbox.refresh,
        setOpen,
      }}
    >
      {children}
    </InboxContext>
  );
}
