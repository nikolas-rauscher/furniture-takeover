import type { AgentQuestionEvent } from "../../../shared/actions";
import type { AssistResponse } from "../../../shared/agent";
import type { AgentRunEvent } from "../../../shared/runs";
import { emptyDraft, type ListingDraft } from "../../listingDraft";
import { DESK } from "./findScript";

/** Léa's photo of her desk: the project's own drawing of it. */
const PHOTO = "/samples/compact-study-desk.svg";

export const PHOTO_DRAFT: ListingDraft = {
  ...emptyDraft("FMEL Triaudes, Ecublens"),
  image: PHOTO,
  images: [PHOTO],
};

/** The details Pako reads from the photo. */
const PHOTO_DETAILS = {
  title: DESK.title,
  description:
    "Small light-wood desk with one drawer. Fits a laptop and a lamp.",
  condition: DESK.condition,
  dimensions: DESK.dimensions,
};

/** What Pako read from the photo, as the photo check answers. */
export const PHOTO_READING: AssistResponse = {
  mode: "live",
  model: "tour",
  suggestions: [],
  missingDetails: ["price"],
  metadata: { ...PHOTO_DETAILS, price: null, keywords: ["desk"] },
};

/** The draft once Pako has the photo's details. */
export const draftFromPhoto = (draft: ListingDraft): ListingDraft => ({
  ...draft,
  ...PHOTO_DETAILS,
});

const SUGGESTED_PRICE = 35;
/** The price Léa drags the slider to, the one Find later shows. */
export const CHOSEN_PRICE = DESK.price;

const PRICE_QUESTION: AgentQuestionEvent = {
  type: "question",
  id: "price",
  listingField: "price",
  question:
    "What should it cost? Similar desks on takeover ask CHF 40 to 65; yours is smaller and has marks on the top.",
  input: { type: "price", min: 0, max: 100, step: 5, value: SUGGESTED_PRICE },
  choices: [`CHF ${SUGGESTED_PRICE}`, "Give it away for free"],
};

const step = (
  id: string,
  label: string,
  state: "running" | "complete",
  task?: "listings" | "listing" | "request",
): AgentRunEvent => ({ type: "status", id, label, state, task });

/** Pako's first run on the listing, before the pickup question is answered. */
export const WRITING_EVENTS: AgentRunEvent[] = [
  step("read", "Reading your request", "running"),
  step("similar", "Searching takeover listings: desk", "running", "listings"),
  step("similar", "Searching takeover listings: desk", "complete", "listings"),
  step("read", "Reading your request", "complete"),
  step("write", "Preparing listing changes", "running", "listing"),
  {
    type: "listing_patch",
    id: "description",
    patch: {
      description:
        "Compact desk in light wood with one drawer, 100 × 50 × 74 cm. Fits a laptop and a lamp. Some marks on the top. Ground-floor pickup.",
    },
    reason: "I wrote the description from your photo and your details.",
    evidence: [],
    requiresAcceptance: false,
  },
  step("write", "Preparing listing changes", "complete", "listing"),
];

/** The rest of the run: Pako's price, put as a question for Léa to decide. */
export const PRICE_EVENTS: AgentRunEvent[] = [
  step("price", "Preparing listing changes", "running", "listing"),
  {
    type: "listing_patch",
    id: "price-suggestion",
    patch: { price: SUGGESTED_PRICE },
    reason:
      "Similar desks on takeover ask CHF 40 to 65. Yours is smaller and has marks on the top, so I suggest CHF 35.",
    evidence: [],
    requiresAcceptance: true,
  },
  step("price", "Preparing listing changes", "complete", "listing"),
  step("ask", "Asking a question", "running", "request"),
  PRICE_QUESTION,
  step("ask", "Asking a question", "complete", "request"),
  {
    type: "complete",
    text: PRICE_QUESTION.question,
    sources: [],
    runId: "tour-listing",
  },
];

export function listingGap(event: AgentRunEvent) {
  if (event.type === "status") return event.state === "running" ? 500 : 950;
  return 450;
}
