import { createContext, useContext, useEffect, useState } from "react";
import type { Deal } from "../../shared/deal";
import type { InboxView } from "../api/inbox";
import { inboxBadge, type InboxThread } from "../inboxActivity";
import type { InboxDeal } from "../inboxDeals";
import { readRoute } from "../navigation";
import type { PakoAvailability } from "./usePakoThread";

type Inbox = {
  screen: InboxView;
  scope: string;
  loaded: boolean;
  deals: Deal[];
  items: InboxDeal[];
  threads: InboxThread[];
  markers: Record<string, string>;
  pickupReadKeys: Set<string>;
  now: Date;
  autoRead: boolean;
  pakoMissing: boolean;
  autoReadUnavailable?: string;
  setAutoRead: (autoRead: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  reset?: () => Promise<void>;
  setOpen: (open: boolean) => void;
};

export const InboxContext = createContext<Inbox | null>(null);

/** Start polling at the right cadence even before the app reports its active view. */
export function useInboxOpen() {
  return useState(() => readRoute(window.location.hash).view === "messages");
}

export function useMessagesInbox({
  open,
  aiConfigured,
}: {
  open: boolean;
  aiConfigured: boolean | undefined;
}) {
  const inbox = useContext(InboxContext);
  if (!inbox) throw new Error("The messages inbox is not configured.");
  const { setOpen, threads, markers, pickupReadKeys, pakoMissing } = inbox;
  const [remaining, setRemaining] = useState<number>();
  useEffect(() => setOpen(open), [open, setOpen]);
  const available: PakoAvailability =
    aiConfigured === false ? "unconfigured" : pakoMissing ? "missing" : "ready";

  return {
    ...inbox,
    unread: inboxBadge(threads, markers, pickupReadKeys),
    available,
    remaining,
    setRemaining,
  };
}
