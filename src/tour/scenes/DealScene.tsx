import { useEffect, useState } from "react";
import type { DealTerms } from "../../../shared/deal";
import { offerMessage, pickedUpMessage } from "../../../shared/dealMessages";
import { formatPickup } from "../../../shared/pickupTime";
import { report } from "../device/sceneMessages";
import AppScreen, { type ScenePage } from "./AppScreen";
import { DESK } from "./findScript";
import SceneMessages from "./SceneMessages";
import { now, type Beat, type SceneProps } from "./sceneScript";
import {
  moveDeal,
  movePickup,
  startThread,
  type SceneThread,
} from "./sceneThread";
import TouchMark from "./TouchMark";
import { useSceneScript } from "./useSceneScript";

const BUYER = "Noah";
const MINUTE = 60_000;
const PAGE: ScenePage = {
  key: "thread",
  view: "messages",
  destination: "messages",
};

type DealState = {
  /** The scene's clock: it jumps ahead to the pickup, and the status bar follows it. */
  now: Date;
  thread: SceneThread;
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
  offers(state: DealState, terms: DealTerms): DealState {
    return {
      ...state,
      thread: moveDeal(state.thread, {
        actor: "buyer",
        action: { type: "propose", terms },
        text: offerMessage(DESK.title, terms),
        now: state.now,
        messageId: "noah-offer",
      }).thread,
    };
  },
  pickedUp(state: DealState): DealState {
    return {
      ...state,
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

const at =
  (minutesBefore: number, pickupAt: Date) =>
  (state: DealState): DealState => ({
    ...state,
    now: new Date(pickupAt.getTime() - minutesBefore * MINUTE),
  });

function dealBeats(pickupAt: Date): Beat<DealState>[] {
  return [
    {
      hold: 1200,
      mood: "listen",
      changes: now((state) => buyer.offers(state, offerTerms(pickupAt))),
    },
    { hold: 3400, tap: ".deal-card-choices > .button.primary", mood: "cheer" },
    { hold: 3600, mood: "work", changes: now(at(25, pickupAt)) },
    { hold: 1600, changes: now(at(15, pickupAt)) },
    { hold: 1600, changes: now(at(5, pickupAt)) },
    { hold: 1600, mood: "deliver", changes: now(at(0, pickupAt)) },
    { hold: 1800, changes: now((state) => buyer.pickedUp(state)) },
    { hold: 2600, tap: ".pickup-card .button.primary", mood: "love" },
  ];
}

/** Agree and pick up: Noah's offer, Léa's Confirm sale, the pickup counting down and Picked up. */
export default function DealScene({ onEnd }: SceneProps) {
  const [start] = useState(() => new Date());
  const [beats] = useState(() => dealBeats(pickupTime(start)));
  const { state, setState, touch } = useSceneScript(
    () => ({ now: start, thread: startThread("tour-deal", DESK) }),
    beats,
    onEnd,
  );
  useEffect(() => {
    report({ kind: "clock", time: state.now.toISOString() });
  }, [state.now]);
  return (
    <>
      <AppScreen page={PAGE}>
        <SceneMessages
          thread={state.thread}
          onThread={(thread) => setState((current) => ({ ...current, thread }))}
          role="seller"
          otherName={BUYER}
          now={state.now}
        />
      </AppScreen>
      <TouchMark touch={touch} />
    </>
  );
}
