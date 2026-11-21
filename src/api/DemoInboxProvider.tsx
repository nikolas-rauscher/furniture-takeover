import type { PropsWithChildren } from "react";
import { demoInboxThread, pickupActivity } from "../inboxActivity";
import { demoInboxDeals } from "../inboxDeals";
import { useDemoInbox } from "../hooks/useDemoInbox";
import { InboxContext, useInboxOpen } from "../hooks/useMessagesInbox";
import { useNow } from "../hooks/useNow";
import { useSaved } from "../hooks/useSaved";
import { useThreadReads } from "../hooks/useThreadReads";
import { demoInboxApi } from "./demoInbox";

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

export function DemoInboxProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useInboxOpen();
  const inbox = useDemoInbox(demoInboxApi, open);
  const reads = useThreadReads();
  const now = useNow(true);
  const [autoRead, setAutoRead] = useSaved(
    "takeover-pako-auto-read",
    true,
    isBoolean,
  );
  const { conversations } = inbox;
  const pickupReadKeys = new Set<string>();
  for (const { id, deal } of conversations)
    if (pickupActivity(deal, "buyer", now).needsYou)
      pickupReadKeys.add(id + ":buyer");

  return (
    <InboxContext
      value={{
        screen: { mode: "demo", inbox, reads, source: demoInboxApi },
        scope: "local",
        loaded: inbox.loaded,
        settled: inbox.loaded || inbox.error !== "",
        deals: conversations.flatMap((thread) =>
          thread.deal ? [thread.deal] : [],
        ),
        items: demoInboxDeals(conversations),
        threads: conversations.map(demoInboxThread),
        markers: reads.reads,
        pickupReadKeys,
        now,
        autoRead,
        pakoMissing: false,
        setAutoRead: async (next) => setAutoRead(next),
        refresh: inbox.refresh,
        reset: inbox.reset,
        setOpen,
      }}
    >
      {children}
    </InboxContext>
  );
}
