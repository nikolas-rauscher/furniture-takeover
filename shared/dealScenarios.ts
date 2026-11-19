import type { DealAction, DealRole, DealTerms, DealEventKind } from "./deal.ts";
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
  statusChange?: "active" | "reserved";
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
      { ...offer, error: "deal_closed" },
    ],
  },
  {
    name: "Matching proposals confirm once",
    steps: [
      offer,
      { ...offer, actor: "seller", kind: "accepted", statusChange: "reserved" },
    ],
  },
  {
    name: "Withdraw and decline require the correct side",
    steps: [
      offer,
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
        { ...step, actor: "seller" as const, error: example.error },
      ],
    };
  }),
];
