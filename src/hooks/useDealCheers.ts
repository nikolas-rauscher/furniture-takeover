import { useEffect, useEffectEvent, useRef } from "react";
import type { InboxDeal } from "../inboxDeals";

/** One agreement of one deal, as the student's side saw it happen. */
const agreementKey = (item: InboxDeal) =>
  item.deal.agreed ? `${item.threadId}:${item.deal.agreed.at}` : null;

/**
 * Agreements that arrive while the student is elsewhere in the app: each new
 * one is cheered once. Deals already agreed when an inbox first loads are
 * old news, and so is an agreement that arrives while Messages is open, where
 * its thread celebrates it.
 */
export function useDealCheers({
  inbox,
  deals,
  loaded,
  elsewhere,
  onCheer,
}: {
  /** Whose inbox this is: another one, such as after signing in, starts over. */
  inbox: string;
  deals: readonly InboxDeal[];
  /** The inbox has loaded, so the deals it lists are known. */
  loaded: boolean;
  /** The student is somewhere other than Messages. */
  elsewhere: boolean;
  onCheer: (item: InboxDeal) => void;
}) {
  const known = useRef<{ inbox: string; keys: Set<string> }>(null);
  const cheer = useEffectEvent(onCheer);
  useEffect(() => {
    if (!loaded) return;
    const agreed = deals.filter((item) => item.deal.status === "agreed");
    if (known.current?.inbox !== inbox) {
      known.current = {
        inbox,
        keys: new Set(agreed.flatMap((item) => agreementKey(item) ?? [])),
      };
      return;
    }
    for (const item of agreed) {
      const key = agreementKey(item);
      if (!key || known.current.keys.has(key)) continue;
      known.current.keys.add(key);
      if (elsewhere) cheer(item);
    }
  }, [inbox, deals, loaded, elsewhere]);
}
