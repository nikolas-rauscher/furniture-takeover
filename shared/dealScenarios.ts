import type { DealAction, DealRole, DealTerms, DealEventKind } from "./deal.ts";
import type { PickupAction, PickupEvent, PickupStatusChange } from "./deal.ts";
import {
  acceptNewTimeMessage,
  availableAgainMessage,
  changeTimeMessage,
  keepTimeMessage,
  lateMessage,
  noShowCheckMessage,
  noShowReleaseMessage,
  onMyWayMessage,
  pickedUpMessage,
} from "./dealMessages.ts";
import { formatPickup } from "./pickupTime.ts";
const terms: DealTerms = {
  amount: 30,
  fulfillment: "shipping",
  pickupAt: null,
  pickupPoint: null,
  pickupTime: null,
};
type Step = {
  actor: DealRole;
  action: DealAction;
  body: string;
  kind?: DealEventKind;
  error?: string;
  statusChange?: "active" | "reserved" | "sold";
};
const offer: Step = {
  actor: "buyer",
  action: { type: "propose", terms },
  body: "CHF 30 shipped?",
  kind: "proposed",
};
const counter: Step = {
  ...offer,
  actor: "seller",
  action: { type: "propose", terms: { ...terms, amount: 25 } },
  body: "CHF 25 shipped?",
};
export const dealScenarios: { name: string; steps: Step[] }[] = [
  {
    name: "Only the other student can confirm the current terms",
    steps: [
      offer,
      { ...offer, action: { type: "accept", terms }, error: "deal_changed" },
      counter,
      { ...offer, action: { type: "accept", terms }, error: "deal_changed" },
      {
        ...counter,
        actor: "buyer",
        action: { type: "accept", terms: { ...terms, amount: 25 } },
        kind: "accepted",
        statusChange: "reserved",
      },
      {
        actor: "seller",
        action: { type: "cancel", reason: "cant_make_it" },
        body: "I need to cancel.",
        kind: "cancelled",
        statusChange: "active",
      },
      offer,
    ],
  },
  {
    name: "A matching counter waits for the other side to confirm",
    steps: [
      offer,
      { ...offer, actor: "seller" },
      {
        ...offer,
        action: { type: "accept", terms },
        kind: "accepted",
        statusChange: "reserved",
      },
      {
        actor: "buyer",
        action: { type: "complete_shipping" },
        body: "It shipped.",
        error: "shipping_unavailable",
      },
      {
        actor: "seller",
        action: { type: "complete_shipping" },
        body: "It shipped.",
        kind: "completed",
        statusChange: "sold",
      },
    ],
  },
  {
    name: "Withdraw and decline require the correct side",
    steps: [
      offer,
      {
        actor: "seller",
        action: { type: "cancel", reason: "changed_mind" },
        body: "Sorry, I can't do it.",
        error: "deal_not_agreed",
      },
      {
        actor: "seller",
        action: { type: "withdraw" },
        body: "Withdraw",
        error: "deal_changed",
      },
      {
        actor: "buyer",
        action: { type: "withdraw" },
        body: "Withdraw",
        kind: "withdrawn",
      },
      offer,
      {
        actor: "seller",
        action: { type: "decline" },
        body: "Pass",
        kind: "declined",
      },
    ],
  },
  {
    name: "A message must state the terms",
    steps: [{ ...offer, body: "Okay", error: "terms_not_stated" }],
  },
  ...[
    {
      name: "Partial proposals need more terms before confirmation",
      terms: { ...terms, fulfillment: null },
      error: "terms_incomplete",
    },
    {
      name: "Pickup confirmation needs a future pickup",
      terms: {
        ...terms,
        fulfillment: "pickup" as const,
        pickupTime: "12:00",
        pickupAt: "2000-11-20T11:00:00Z",
        pickupPoint: "Atrium",
      },
      error: "pickup_time_past",
    },
  ].map((example) => {
    const step: Step = {
      ...offer,
      action: { type: "propose", terms: example.terms },
      body: "CHF 30, 12:00, Atrium",
    };
    return {
      name: example.name,
      steps: [
        step,
        ...(example.error === "terms_incomplete"
          ? [{ ...step, actor: "seller" as const }]
          : []),
        {
          ...step,
          actor:
            example.error === "terms_incomplete"
              ? ("buyer" as const)
              : ("seller" as const),
          action: { type: "accept" as const, terms: example.terms },
          error: example.error,
        },
      ],
    };
  }),
];

export type PickupStep = {
  actor: DealRole;
  action: PickupAction;
  body: string;
  kind?: PickupEvent["kind"];
  error?: string;
  statusChange?: PickupStatusChange;
};

export function pickupScenarios(
  terms: DealTerms,
  later: string,
  releasedConversationId: string,
) {
  const next = { ...terms, pickupAt: later, pickupTime: formatPickup(later) };
  const suggest: PickupStep = {
    actor: "buyer",
    action: { type: "suggest_time", terms: next },
    body: changeTimeMessage(next),
    kind: "time_suggested",
  };
  const accept: PickupStep = {
    actor: "seller",
    action: { type: "accept_time", terms: next },
    body: acceptNewTimeMessage(next),
    kind: "time_accepted",
  };
  return {
    handling: [
      {
        actor: "buyer",
        action: { type: "on_my_way" },
        body: onMyWayMessage(terms),
        kind: "on_my_way",
      },
      {
        actor: "seller",
        action: { type: "late", minutes: 10 },
        body: lateMessage(10),
        kind: "late",
      },
      suggest,
      { ...accept, actor: "buyer", error: "deal_changed" },
      {
        actor: "seller",
        action: { type: "keep_time" },
        body: keepTimeMessage(terms),
        kind: "time_kept",
      },
      { ...suggest, body: "Can we talk?", error: "terms_not_stated" },
      suggest,
      accept,
      {
        actor: "buyer",
        action: { type: "picked_up" },
        body: pickedUpMessage("buyer", "desk"),
        kind: "picked_up",
      },
      {
        actor: "seller",
        action: { type: "picked_up" },
        body: pickedUpMessage("seller", "desk"),
        kind: "picked_up",
        statusChange: "sold",
      },
    ] satisfies PickupStep[],
    earlyNoShow: {
      actor: "seller",
      action: { type: "no_show" },
      body: noShowCheckMessage(terms),
      error: "too_early",
    } satisfies PickupStep,
    overdue: [
      {
        actor: "buyer",
        action: { type: "no_show" },
        body: noShowCheckMessage(terms),
        kind: "no_show",
      },
      {
        actor: "seller",
        action: { type: "no_show" },
        body: noShowCheckMessage(terms),
        kind: "no_show",
      },
      {
        actor: "seller",
        action: { type: "release_no_show" },
        body: noShowReleaseMessage("desk", "seller"),
        kind: "no_show_released",
        statusChange: "active",
      },
    ] satisfies PickupStep[],
    nextBuyer: {
      actor: "seller",
      action: { type: "offer_again", releasedConversationId },
      body: availableAgainMessage("desk"),
      kind: "offered_again",
    } satisfies PickupStep,
  };
}
