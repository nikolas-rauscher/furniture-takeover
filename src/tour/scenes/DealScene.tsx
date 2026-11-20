import { useEffect, useState } from "react";
import { Clock } from "@/components/icons";
import type { DealTerms } from "../../../shared/deal";
import { offerMessage, pickedUpMessage } from "../../../shared/dealMessages";
import { cardImageFor } from "../../../shared/listingPhotos";
import { formatPickup } from "../../../shared/pickupTime";
import type { ThreadRow } from "../../components/messagesModel";
import { transitionPage } from "../../pageTransition";
import { report } from "../device/sceneMessages";
import AppScreen, { type ScenePage } from "./AppScreen";
import { DESK } from "./findScript";
import SceneMarks from "./SceneMarks";
import SceneMessages from "./SceneMessages";
import { now, type Beat, type SceneProps } from "./sceneScript";
import {
  moveDeal,
  movePickup,
  startThread,
  writeAhead,
  type SceneThread,
} from "./sceneThread";
import { useSceneScript } from "./useSceneScript";

const BUYER = "Noah";
const MINUTE = 60_000;
const OFFER_ID = "noah-offer";

type View = "inbox" | "thread";

const PAGES: Record<View, ScenePage> = {
  inbox: { key: "inbox", view: "messages", destination: "messages" },
  thread: { key: "thread", view: "messages", destination: "messages" },
};

/** Léa's earlier conversation, already read, below the one that arrives. */
const EARLIER_ROW: ThreadRow = {
  id: "tour-earlier",
  active: false,
  image: "/samples/desk-lamp.svg",
  name: "Maya",
  title: "Desk lamp",
  preview: "Thanks, see you on Thursday.",
};

type DealState = {
  view: View;
  /** The scene's clock: it jumps ahead to the pickup, and the status bar follows it. */
  now: Date;
  /** The clock just jumped: a label says to when. */
  skipped: boolean;
  thread: SceneThread;
  pakoAwake: boolean;
};

/** A pickup on the next full half hour at least three hours ahead, so the deal can be booked. */
function pickupTime(from: Date) {
  const halfHour = 30 * MINUTE;
  return new Date(
    Math.ceil((from.getTime() + 180 * MINUTE) / halfHour) * halfHour,
  );
}

function offerTerms(pickupAt: Date): DealTerms {
  const at = pickupAt.toISOString();
  if (!DESK.pickupPoint) throw new Error("The desk needs its meeting point.");
  return {
    amount: 35,
    fulfillment: "pickup",
    pickupAt: at,
    pickupTime: formatPickup(at),
    pickupPoint: DESK.pickupPoint.name,
  };
}

/** The buyer's side: an offer, and later Picked up, each sent from their own deal card. */
const buyer = {
  /** Noah's offer as the message the inbox shows first. */
  writes(state: DealState, terms: DealTerms): DealState {
    return {
      ...state,
      thread: writeAhead(state.thread, {
        actor: "buyer",
        action: undefined,
        text: offerMessage(DESK.title, terms),
        now: state.now,
        messageId: OFFER_ID,
      }),
    };
  },
  /** The same offer's terms on the deal card. */
  offers(state: DealState, terms: DealTerms): DealState {
    return {
      ...state,
      thread: moveDeal(state.thread, {
        actor: "buyer",
        action: { type: "propose", terms },
        text: offerMessage(DESK.title, terms),
        now: state.now,
        messageId: OFFER_ID,
      }).thread,
    };
  },
  pickedUp(state: DealState): DealState {
    return {
      ...state,
      skipped: false,
      thread: movePickup(state.thread, {
        actor: "buyer",
        action: { type: "picked_up" },
        text: pickedUpMessage("buyer", DESK.title),
        now: state.now,
        messageId: "noah-picked-up",
      }).thread,
    };
  },
};

/** The clock jumps to some minutes before the pickup. */
const skipTo =
  (minutesBefore: number, pickupAt: Date) =>
  (state: DealState): DealState => ({
    ...state,
    skipped: true,
    now: new Date(pickupAt.getTime() - minutesBefore * MINUTE),
  });

const DEAL_CARD = ".thread-deal";
const PICKUP_CARD = ".pickup-card";

/** One thing at a time: the row, the message, the card, Pako's line, then each tap and its answer. */
function dealBeats(pickupAt: Date): Beat<DealState>[] {
  const terms = offerTerms(pickupAt);
  return [
    {
      hold: 1400,
      mood: "listen",
      changes: now((state) => buyer.writes(state, terms)),
      show: ".chat-thread.unread",
    },
    { hold: 2200, tap: ".chat-thread.unread" },
    {
      hold: 2000,
      changes: now((state) => buyer.offers(state, terms)),
      show: DEAL_CARD,
      mood: "work",
    },
    {
      hold: 1500,
      changes: now((state) => ({ ...state, pakoAwake: true })),
      show: ".thread-tray",
      mood: "listen",
    },
    {
      hold: 2800,
      tap: ".deal-card-choices > .button.primary",
      cue: "Tap Confirm sale",
      mood: "cheer",
    },
    {
      hold: 3400,
      changes: now(skipTo(25, pickupAt)),
      show: PICKUP_CARD,
      mood: "work",
    },
    {
      hold: 2800,
      changes: now(skipTo(0, pickupAt)),
      show: PICKUP_CARD,
      mood: "deliver",
    },
    {
      hold: 2400,
      changes: now((state) => buyer.pickedUp(state)),
      show: PICKUP_CARD,
    },
    {
      hold: 1800,
      tap: ".pickup-card .button.primary",
      cue: "Tap Mark sold",
      mood: "love",
    },
  ];
}

const SKIP_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Says where the clock jumped to, over the screen's top. */
function TimeSkip({ time }: { time: Date }) {
  return (
    <span className="tour-time-skip">
      <Clock size={16} aria-hidden="true" />
      {SKIP_LABEL.format(time)}
    </span>
  );
}

/** Agree and pick up: Noah's offer arrives, Léa confirms, the pickup counts down, Picked up and Mark sold. */
export default function DealScene({ onEnd }: SceneProps) {
  const [start] = useState(() => new Date());
  const [beats] = useState(() => dealBeats(pickupTime(start)));
  const { state, setState, marks } = useSceneScript<DealState>(
    () => ({
      view: "inbox",
      now: start,
      skipped: false,
      thread: startThread("tour-deal", DESK),
      pakoAwake: false,
    }),
    beats,
    onEnd,
  );
  useEffect(() => {
    report({ kind: "clock", time: state.now.toISOString() });
  }, [state.now]);
  const latest = state.thread.messages.at(-1);
  const rows: ThreadRow[] = latest
    ? [
        {
          id: state.thread.conversationId,
          active: false,
          image: cardImageFor(DESK),
          name: BUYER,
          title: DESK.title,
          preview: latest.text,
          unread: state.view === "inbox",
          onSelect: () =>
            transitionPage("nav-forward", () =>
              setState((current) => ({ ...current, view: "thread" })),
            ),
        },
        EARLIER_ROW,
      ]
    : [EARLIER_ROW];
  return (
    <>
      <AppScreen page={PAGES[state.view]}>
        <SceneMessages
          thread={state.thread}
          onThread={(thread) => setState((current) => ({ ...current, thread }))}
          role="seller"
          otherName={BUYER}
          now={state.now}
          inbox={{ open: state.view === "thread", rows }}
          pakoAwake={state.pakoAwake}
        />
      </AppScreen>
      {state.skipped && <TimeSkip key={state.now.getTime()} time={state.now} />}
      <SceneMarks {...marks} />
    </>
  );
}
