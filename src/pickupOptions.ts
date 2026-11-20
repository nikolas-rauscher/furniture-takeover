import {
  pickupDay,
  type Deal,
  type DealRole,
  type DealTerms,
  type LateMinutes,
  type PickupAction,
} from "../shared/deal.ts";
import {
  acceptNewTimeMessage,
  cantMakeItMessage,
  changeTimeMessage,
  keepTimeMessage,
  lateMessage,
  noShowCheckMessage,
  noShowReleaseMessage,
  onMyWayMessage,
  pickedUpMessage,
  pickupDidntHappenMessage,
  pickupHappenedMessage,
  withdrawTimeMessage,
} from "../shared/dealMessages.ts";
import { formatPickup, zurichClockTime } from "../shared/pickupTime.ts";
import { shortPickup } from "./dealWords.ts";

export type PickupDay = NonNullable<ReturnType<typeof pickupDay>>;

/** One pickup action and exactly the message its tap sends. */
export type PickupSend = { action: PickupAction; message: string };

/**
 * Something the pickup card offers. A choice with `send` goes out as it is;
 * "late" and "change_time" open their chips first. Nothing is sent before the
 * student's own tap on the message they read.
 */
export type PickupChoice = {
  id:
    | "on_my_way"
    | "late"
    | "change_time"
    | "cant_make_it"
    | "picked_up"
    | "confirm_pickup_happened"
    | "release_stale_pickup"
    | "no_show"
    | "release"
    | "accept_time"
    | "keep_time"
    | "withdraw_time";
  label: string;
  send?: PickupSend;
  /** Asked before a tap that ends the pickup. */
  confirm?: string;
  /** What the button under that question says; other messages simply go to the other student. */
  confirmLabel?: string;
  /** Why the choice can't be tapped now, said beside it. */
  unavailable?: string;
  /** What the tap does to the deal, said under its message when it sends at once. */
  effect?: string;
};

export type PickupChoices = {
  primary?: PickupChoice;
  secondary: PickupChoice[];
};

export const LATE_MINUTES: readonly LateMinutes[] = [10, 20, 30];

export const lateSend = (minutes: LateMinutes): PickupSend => ({
  action: { type: "late", minutes },
  message: lateMessage(minutes),
});

/** The booked terms at another time: same price, same place. */
export function movedTerms(terms: DealTerms, pickupAt: string): DealTerms {
  return { ...terms, pickupAt, pickupTime: formatPickup(pickupAt) };
}

export const changeSend = (terms: DealTerms): PickupSend => ({
  action: { type: "suggest_time", terms },
  message: changeTimeMessage(terms),
});

type Context = {
  day: PickupDay;
  deal: Deal;
  role: DealRole;
  other: string;
  title: string;
};

function signalClosed(day: PickupDay) {
  return day.minutesUntil > 0
    ? "You can send this from 3 h before pickup."
    : "Pickup was over an hour ago.";
}

function onMyWay({ day, deal, role, other }: Context): PickupChoice {
  const sentAt = deal.pickup?.onWay[role];
  return {
    id: "on_my_way",
    label: "On my way",
    send: { action: { type: "on_my_way" }, message: onMyWayMessage(day.terms) },
    unavailable: sentAt
      ? `You told ${other} at ${zurichClockTime(sentAt)}.`
      : day.canSignal
        ? undefined
        : signalClosed(day),
  };
}

const late = ({ day }: Context): PickupChoice => ({
  id: "late",
  label: "Running late",
  unavailable: day.canSignal ? undefined : signalClosed(day),
});

const changeTime: PickupChoice = { id: "change_time", label: "Change time" };

function cantMakeIt({ role, other, title }: Context): ListingPickupChoice {
  return {
    id: "cant_make_it",
    label: "Can't make it",
    send: {
      action: { type: "cancel_pickup", reason: "cant_make_it" },
      message: cantMakeItMessage(),
    },
    confirm:
      role === "seller"
        ? `Cancel the pickup with ${other}? The ${title} goes back on sale.`
        : `Cancel the pickup? The ${title} goes back on sale and isn't reserved for you anymore.`,
    confirmLabel: "Cancel pickup",
  };
}

function pickedUp({
  day,
  role,
  other,
  title,
}: Context): PickupChoice & { send: PickupSend } {
  const send = {
    action: { type: "picked_up" },
    message: pickedUpMessage(role, title),
  } as const;
  if (role === "seller")
    return {
      id: "picked_up",
      label: "Mark sold",
      send,
      unavailable: day.canMarkSold
        ? undefined
        : "You can mark it sold at pickup time.",
    };
  return {
    id: "picked_up",
    label: "Picked up",
    send,
    unavailable: day.buyerReportedPickup
      ? `Waiting for ${other} to mark it sold.`
      : undefined,
  };
}

const noShow = ({ day, other }: Context): PickupChoice => ({
  id: "no_show",
  label: `${other} didn't show up`,
  send: { action: { type: "no_show" }, message: noShowCheckMessage(day.terms) },
});

function release({ role, other, title }: Context): PickupChoice {
  const label = role === "seller" ? "Release the item" : "Cancel the pickup";
  return {
    id: "release",
    label,
    confirmLabel: label,
    send: {
      action: { type: "release_no_show" },
      message: noShowReleaseMessage(title, role),
    },
    confirm:
      role === "seller"
        ? `Release the ${title}? The pickup with ${other} ends and it goes back on sale.`
        : `Cancel the pickup with ${other}? The ${title} goes back on sale.`,
  };
}

/** A new time on the table: the other side accepts it or keeps the booked one; the proposer can take it back. */
function changeChoices(context: Context, proposed: DealTerms): PickupChoices {
  const { day } = context;
  if (day.change === "sent")
    return {
      secondary: [
        {
          id: "withdraw_time",
          label: "Withdraw new time",
          send: {
            action: { type: "withdraw_time" },
            message: withdrawTimeMessage(day.terms),
          },
        },
        cantMakeIt(context),
      ],
    };
  return {
    primary: {
      id: "accept_time",
      label: "Accept new time",
      send: {
        action: { type: "accept_time", terms: proposed },
        message: acceptNewTimeMessage(proposed),
      },
    },
    secondary: [
      {
        id: "keep_time",
        label: `Keep ${shortPickup(day.terms.pickupAt!)}`,
        send: {
          action: { type: "keep_time" },
          message: keepTimeMessage(day.terms),
        },
      },
      cantMakeIt(context),
    ],
  };
}

/** Overdue: the handover still counts, or the student says the other didn't come, then releases. */
function overdueChoices(context: Context): PickupChoices {
  const { deal, role, day } = context;
  const reported = deal.pickup?.noShow?.by === role;
  return {
    primary: pickedUp(context),
    secondary: [
      reported ? release(context) : noShow(context),
      ...(day.canSignal ? [late(context)] : []),
      cantMakeIt(context),
    ],
  };
}

/**
 * A day after an unclosed pickup, Pako asks both students whether it
 * happened. Each answer sends its message on the tap that reads it; the
 * first answer closes the deal for both. Once the buyer reported it picked
 * up, it can no longer be released.
 */
function pickupCheckChoices({ day, title }: Context): {
  primary: PickupChoice & { send: PickupSend; effect: string };
  secondary: (PickupChoice & { send: PickupSend; effect: string })[];
} {
  return {
    primary: {
      id: "confirm_pickup_happened",
      label: "Yes, it's done",
      send: {
        action: { type: "confirm_pickup_happened" },
        message: pickupHappenedMessage(title),
      },
      effect: "Completes the deal and marks it sold.",
    },
    secondary: day.buyerReportedPickup
      ? []
      : [
          {
            id: "release_stale_pickup",
            label: "No, release it",
            send: {
              action: { type: "release_stale_pickup" },
              message: pickupDidntHappenMessage(title),
            },
            effect: "Ends the reservation and puts it back on sale.",
          },
        ],
  };
}

/** A choice that sends, with the question asked before it. */
export type ListingPickupChoice = PickupChoice & {
  send: PickupSend;
  confirm: string;
};

/**
 * My listings on a listing with a booked pickup: Mark sold and Make active go
 * through the pickup's own actions, with the same message and a separate tap.
 */
export function listingPickupChoices(context: Omit<Context, "role">): {
  sold: ListingPickupChoice;
  reopen: ListingPickupChoice;
} {
  const seller = { ...context, role: "seller" as const };
  const sold = pickedUp(seller);
  const reopen = cantMakeIt(seller);
  return {
    sold: {
      ...sold,
      confirm: `Mark the ${context.title} as picked up by ${context.other}?`,
    },
    reopen: { ...reopen, label: "Cancel pickup" },
  };
}

/**
 * What the pickup card offers from the reading student's side, by how close
 * the pickup is: a new time first when one is on the table, then the
 * handover, signals on the way there and the ways out. Each has at most one
 * primary action.
 */
export function pickupChoices(context: Context): PickupChoices {
  const { day, deal } = context;
  if (day.pickupCheck)
    return day.pickupCheck.expired
      ? { secondary: [] }
      : pickupCheckChoices(context);
  if (day.buyerReportedPickup)
    return { primary: pickedUp(context), secondary: [] };
  if (day.change && deal.proposal)
    return changeChoices(context, deal.proposal.terms);
  switch (day.phase) {
    case "booked":
      return {
        secondary: [onMyWay(context), changeTime, cantMakeIt(context)],
      };
    case "pickup_soon": {
      const way = onMyWay(context);
      return way.unavailable
        ? { secondary: [way, late(context), changeTime, cantMakeIt(context)] }
        : {
            primary: way,
            secondary: [late(context), changeTime, cantMakeIt(context)],
          };
    }
    case "pickup_now": {
      const way = onMyWay(context);
      return {
        primary: pickedUp(context),
        secondary: [
          ...(way.unavailable ? [] : [way]),
          late(context),
          cantMakeIt(context),
        ],
      };
    }
    case "overdue":
      return overdueChoices(context);
  }
}
