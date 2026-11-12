import type { Product } from "../../shared/marketplace.ts";
import {
  HOLD_HOURS,
  HOUR_MS,
  SELLER_REPLY_HOURS,
  WAITLIST_PRIORITY_HOURS,
} from "./config.ts";

export type ListingStatus = Product["status"];
export type ListingRef = Pick<Product, "id" | "title" | "status">;

/** Only open reservations are kept; a closed one leaves a notice behind. */
export type Reservation = {
  listingId: string;
  title: string;
  status: "pending" | "held";
  requestedAt: string;
  /** Pickup day the buyer asked for, YYYY-MM-DD. */
  pickupBy: string;
  replyBy: string;
  holdUntil?: string;
};

/** One browser plays one buyer, so every entry belongs to that buyer. */
export type WaitlistEntry = {
  listingId: string;
  title: string;
  joinedAt: string;
  /** Set when the item is free again; the buyer may request first until then. */
  priorityUntil?: string;
};

export type NoticeKind =
  "declined" | "expired" | "hold_ended" | "available_again";

export type AvailabilityNotice = {
  id: string;
  kind: NoticeKind;
  listingId: string;
  /** Kept because a removed listing is no longer visible to look up. */
  title: string;
  createdAt: string;
  until?: string;
};

export type AvailabilityState = {
  version: 1;
  /** Simulated clock: demo controls move time forward instead of real timers. */
  clockOffsetMs: number;
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  notices: AvailabilityNotice[];
  /** Status of each listing before this feature first changed it. */
  originalStatus: Record<string, ListingStatus>;
  /** Message threads this feature started; Reset demo deletes them. */
  threads: string[];
};

export type StatusChange = { listingId: string; status: ListingStatus };

/** Status changes are returned, not applied, so the app keeps one status path. */
export type Transition = {
  state: AvailabilityState;
  statusChanges: StatusChange[];
  /** Notices raised by this transition, for toasts. */
  notices: AvailabilityNotice[];
};

export type ListingAvailability =
  | { kind: "open"; priorityUntil?: string }
  | { kind: "pending"; reservation: Reservation }
  | { kind: "held"; reservation: Reservation }
  | { kind: "reserved"; position?: number }
  | { kind: "sold"; declined: boolean }
  | { kind: "removed"; expired: boolean };

export const emptyAvailability = (): AvailabilityState => ({
  version: 1,
  clockOffsetMs: 0,
  reservations: [],
  waitlist: [],
  notices: [],
  originalStatus: {},
  threads: [],
});

const after = (now: Date, hours: number) =>
  new Date(now.getTime() + hours * HOUR_MS).toISOString();
const reached = (deadline: string, now: Date) =>
  now.getTime() >= Date.parse(deadline);

function begin(state: AvailabilityState): Transition {
  return { state, statusChanges: [], notices: [] };
}

function statusOf(t: Transition, listing: ListingRef): ListingStatus {
  return (
    t.statusChanges.filter((change) => change.listingId === listing.id).at(-1)
      ?.status ?? listing.status
  );
}

function setListingStatus(
  t: Transition,
  listing: ListingRef,
  status: ListingStatus,
) {
  if (statusOf(t, listing) === status) return;
  if (!Object.hasOwn(t.state.originalStatus, listing.id))
    t.state = {
      ...t.state,
      originalStatus: {
        ...t.state.originalStatus,
        [listing.id]: listing.status,
      },
    };
  t.statusChanges.push({ listingId: listing.id, status });
}

function update(t: Transition, changes: Partial<AvailabilityState>) {
  t.state = { ...t.state, ...changes };
}

function closeReservation(t: Transition, listingId: string) {
  update(t, {
    reservations: t.state.reservations.filter(
      (item) => item.listingId !== listingId,
    ),
  });
}

function clearNotices(t: Transition, listingId: string) {
  update(t, {
    notices: t.state.notices.filter((item) => item.listingId !== listingId),
  });
}

function dropWaitlist(t: Transition, listingId: string) {
  update(t, {
    waitlist: t.state.waitlist.filter((item) => item.listingId !== listingId),
  });
}

/** The latest outcome replaces older notices for the same listing. */
function notify(
  t: Transition,
  kind: NoticeKind,
  listing: Pick<ListingRef, "id" | "title">,
  now: Date,
  until?: string,
) {
  const notice: AvailabilityNotice = {
    id: `${kind}:${listing.id}:${now.toISOString()}`,
    kind,
    listingId: listing.id,
    title: listing.title,
    createdAt: now.toISOString(),
    ...(until ? { until } : {}),
  };
  clearNotices(t, listing.id);
  update(t, { notices: [...t.state.notices, notice] });
  t.notices.push(notice);
}

/** The first waiting buyer gets a priority window once the item is free. */
function handOver(t: Transition, listing: ListingRef, now: Date) {
  const entry = t.state.waitlist.find(
    (item) => item.listingId === listing.id && !item.priorityUntil,
  );
  if (!entry) return;
  const priorityUntil = after(now, WAITLIST_PRIORITY_HOURS);
  update(t, {
    waitlist: t.state.waitlist.map((item) =>
      item === entry ? { ...item, priorityUntil } : item,
    ),
  });
  notify(t, "available_again", listing, now, priorityUntil);
}

export function reservationFor(state: AvailabilityState, listingId: string) {
  return state.reservations.find((item) => item.listingId === listingId);
}

export function requestReservation(
  state: AvailabilityState,
  listing: ListingRef,
  pickupBy: string,
  now: Date,
): Transition {
  const t = begin(state);
  if (listing.status !== "active" || reservationFor(state, listing.id))
    return t;
  update(t, {
    reservations: [
      ...state.reservations,
      {
        listingId: listing.id,
        title: listing.title,
        status: "pending",
        requestedAt: now.toISOString(),
        pickupBy,
        replyBy: after(now, SELLER_REPLY_HOURS),
      },
    ],
  });
  // A priority turn is used up by requesting; older outcomes are stale now.
  dropWaitlist(t, listing.id);
  clearNotices(t, listing.id);
  return t;
}

export function confirmReservation(
  state: AvailabilityState,
  listing: ListingRef,
  now: Date,
): Transition {
  const t = begin(state);
  const reservation = reservationFor(state, listing.id);
  if (reservation?.status !== "pending" || listing.status !== "active")
    return t;
  update(t, {
    reservations: state.reservations.map((item) =>
      item === reservation
        ? { ...item, status: "held", holdUntil: after(now, HOLD_HOURS) }
        : item,
    ),
  });
  setListingStatus(t, listing, "reserved");
  return t;
}

export function declineReservation(
  state: AvailabilityState,
  listing: ListingRef,
  now: Date,
): Transition {
  const t = begin(state);
  if (reservationFor(state, listing.id)?.status !== "pending") return t;
  closeReservation(t, listing.id);
  dropWaitlist(t, listing.id);
  setListingStatus(t, listing, "sold");
  notify(t, "declined", listing, now);
  return t;
}

export function cancelReservation(
  state: AvailabilityState,
  listing: ListingRef,
  now: Date,
): Transition {
  const t = begin(state);
  const reservation = reservationFor(state, listing.id);
  if (!reservation) return t;
  closeReservation(t, listing.id);
  if (reservation.status === "held" && listing.status === "reserved") {
    setListingStatus(t, listing, "active");
    handOver(t, listing, now);
  }
  return t;
}

export function joinWaitlist(
  state: AvailabilityState,
  listing: ListingRef,
  now: Date,
): Transition {
  const t = begin(state);
  if (
    listing.status !== "reserved" ||
    reservationFor(state, listing.id) ||
    state.waitlist.some((item) => item.listingId === listing.id)
  )
    return t;
  update(t, {
    waitlist: [
      ...state.waitlist,
      {
        listingId: listing.id,
        title: listing.title,
        joinedAt: now.toISOString(),
      },
    ],
  });
  return t;
}

export function leaveWaitlist(
  state: AvailabilityState,
  listingId: string,
): Transition {
  const t = begin(state);
  if (!state.waitlist.some((item) => item.listingId === listingId)) return t;
  dropWaitlist(t, listingId);
  update(t, {
    notices: t.state.notices.filter(
      (item) =>
        !(item.listingId === listingId && item.kind === "available_again"),
    ),
  });
  return t;
}

/** Demo control: every reservation held by another buyer is cancelled. */
export function releaseOtherReservations(
  state: AvailabilityState,
  listings: ListingRef[],
  now: Date,
): Transition {
  const t = begin(state);
  for (const listing of listings) {
    if (listing.status !== "reserved" || reservationFor(state, listing.id))
      continue;
    setListingStatus(t, listing, "active");
    handOver(t, listing, now);
  }
  return t;
}

/**
 * Applies every deadline reached at `now` and drops records that no longer
 * match their listing, e.g. after a status change in My space.
 */
export function advance(
  state: AvailabilityState,
  listings: ListingRef[],
  now: Date,
): Transition {
  const t = begin(state);
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  for (const reservation of state.reservations) {
    const listing = byId.get(reservation.listingId);
    const expected = reservation.status === "pending" ? "active" : "reserved";
    if (!listing || listing.status !== expected) {
      closeReservation(t, reservation.listingId);
    } else if (
      reservation.status === "pending" &&
      reached(reservation.replyBy, now)
    ) {
      closeReservation(t, listing.id);
      setListingStatus(t, listing, "withdrawn");
      notify(t, "expired", listing, now);
    } else if (
      reservation.status === "held" &&
      reservation.holdUntil &&
      reached(reservation.holdUntil, now)
    ) {
      closeReservation(t, listing.id);
      setListingStatus(t, listing, "active");
      notify(t, "hold_ended", listing, now);
      handOver(t, listing, now);
    }
  }
  for (const entry of t.state.waitlist) {
    const listing = byId.get(entry.listingId);
    const status = listing && statusOf(t, listing);
    if (!listing || status === "sold" || status === "withdrawn") {
      dropWaitlist(t, entry.listingId);
    } else if (entry.priorityUntil && reached(entry.priorityUntil, now)) {
      t.state = leaveWaitlist(t.state, entry.listingId).state;
    } else if (!entry.priorityUntil && status === "active") {
      // Freed outside the demo controls; the waiting buyer is still first.
      handOver(t, listing, now);
    }
  }
  return t;
}

/** Restores each listing this feature changed and forgets everything else. */
export function resetAvailability(
  state: AvailabilityState,
  listings: ListingRef[],
): Transition {
  const t = begin(emptyAvailability());
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  for (const [id, status] of Object.entries(state.originalStatus)) {
    const listing = byId.get(id);
    if (listing && listing.status !== status)
      t.statusChanges.push({ listingId: id, status });
  }
  return t;
}

export function skipHours(
  state: AvailabilityState,
  hours: number,
): AvailabilityState {
  return { ...state, clockOffsetMs: state.clockOffsetMs + hours * HOUR_MS };
}

export function dismissNotice(
  state: AvailabilityState,
  id: string,
): AvailabilityState {
  return { ...state, notices: state.notices.filter((item) => item.id !== id) };
}

export function rememberThread(
  state: AvailabilityState,
  listingId: string,
): AvailabilityState {
  return state.threads.includes(listingId)
    ? state
    : { ...state, threads: [...state.threads, listingId] };
}

export function listingAvailability(
  state: AvailabilityState,
  listing: ListingRef,
  now: Date,
): ListingAvailability {
  const reservation = reservationFor(state, listing.id);
  if (reservation?.status === "pending" && listing.status === "active")
    return { kind: "pending", reservation };
  if (reservation?.status === "held" && listing.status === "reserved")
    return { kind: "held", reservation };
  const notice = state.notices.find((item) => item.listingId === listing.id);
  if (listing.status === "sold")
    return { kind: "sold", declined: notice?.kind === "declined" };
  if (listing.status === "withdrawn")
    return { kind: "removed", expired: notice?.kind === "expired" };
  const waiting = state.waitlist.filter(
    (item) => item.listingId === listing.id,
  );
  if (listing.status === "reserved")
    return waiting.length
      ? { kind: "reserved", position: 1 }
      : { kind: "reserved" };
  const priorityUntil = waiting[0]?.priorityUntil;
  return priorityUntil && !reached(priorityUntil, now)
    ? { kind: "open", priorityUntil }
    : { kind: "open" };
}
