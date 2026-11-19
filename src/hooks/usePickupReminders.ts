import { useEffect, useEffectEvent } from "react";
import { pickupDay } from "../../shared/deal";
import type { InboxDeal } from "../inboxDeals";
import { useSaved } from "./useSaved";

/** Enough remembered reminders to cover any recent inbox. */
const MAX_REMINDERS = 200;

const isKeys = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** One reminder per person and booked instant: a new time reminds again. */
const reminderKey = (item: InboxDeal) =>
  `${item.threadId}:${item.role}:${item.deal.agreed?.terms.pickupAt}`;

/**
 * The in-app reminder 2 h before a booked pickup, once for each person and
 * pickup time, while the student is elsewhere in the app. It only tells; it
 * never sends anything. Each account remembers its own reminders.
 */
export function usePickupReminders({
  deals,
  loaded,
  elsewhere,
  now,
  onRemind,
}: {
  deals: readonly InboxDeal[];
  loaded: boolean;
  /** The student is somewhere other than Messages. */
  elsewhere: boolean;
  now: Date;
  onRemind: (item: InboxDeal) => void;
}) {
  const [reminded, setReminded] = useSaved<string[]>(
    "takeover-pickup-reminders",
    [],
    isKeys,
  );
  const remind = useEffectEvent(onRemind);
  const due = deals.find((item) => {
    const day = pickupDay(item.deal, item.role, now);
    return (
      day?.phase === "pickup_soon" && !reminded.includes(reminderKey(item))
    );
  });
  useEffect(() => {
    if (!loaded || !elsewhere || !due) return;
    setReminded((current) =>
      [...current, reminderKey(due)].slice(-MAX_REMINDERS),
    );
    remind(due);
  }, [loaded, elsewhere, due, setReminded]);
}
