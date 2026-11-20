import { demoListings } from "../../../shared/demoListings";
import type { Product } from "../../../shared/marketplace";
import type { AgentRunEvent } from "../../../shared/runs";

function demoListing(id: string): Product {
  const listing = demoListings.find((item) => item.id === id);
  if (!listing) throw new Error(`The example needs the sample listing ${id}.`);
  return listing;
}

/** The listings near EPFL that Home shows first, as in the local demo. */
export const NEARBY = demoListings.slice(0, 6);

export const REQUEST = "a desk under CHF 80 near Vortex";
export const AREA = "EPFL";

/** Léa's compact study desk, the one the buyer picks. */
export const DESK = demoListing("demo-v1-2");
const WORK_DESK = demoListing("demo-v1-1");
export const SEARCH_RESULTS = [DESK, WORK_DESK];

const ANSWER =
  "Two desks fit under CHF 80. The compact study desk is CHF 40 and can be picked up on weekday evenings. The white work desk is larger, 120 cm, for CHF 65 with pickup at the weekend. Both are in Ecublens, a short ride from Vortex.";

const step = (
  id: string,
  label: string,
  state: "running" | "complete",
  task?: "listings",
): AgentRunEvent => ({ type: "status", id, label, state, task });

/** Pako's search, written as the events his real turns stream, words in small groups. */
export const SEARCH_EVENTS: AgentRunEvent[] = [
  step("read", "Reading your request", "running"),
  step("read", "Reading your request", "complete"),
  step("catalog", "Searching takeover listings: desk", "running", "listings"),
  { type: "inventory_matches", ids: [DESK.id, WORK_DESK.id, "demo-v1-6"] },
  step("catalog", "Searching takeover listings: desk", "complete", "listings"),
  step("select", "Selecting takeover matches", "running", "listings"),
  { type: "inventory_matches", ids: SEARCH_RESULTS.map((item) => item.id) },
  step("select", "Selecting takeover matches", "complete", "listings"),
  step("review", "Reviewing tool results", "running"),
  step("review", "Reviewing tool results", "complete"),
  ...ANSWER.split(/(?<=\s)/).map((text): AgentRunEvent => ({
    type: "text_delta",
    text,
  })),
  { type: "complete", text: ANSWER, sources: [], runId: "tour-search" },
];

/** How long each event of the search takes to arrive. */
export function searchGap(event: AgentRunEvent) {
  if (event.type === "text_delta") return 55;
  if (event.type === "status") return event.state === "running" ? 450 : 900;
  return 300;
}
