import test from "node:test";
import assert from "node:assert/strict";
import { researchedProposal } from "./price-research.ts";

test("price research counts near-duplicate offers once and excludes isolated outliers", () => {
  const offers = [
    "Used IKEA desk with white top and silver legs, 120x60. Pickup Lausanne. CHF 35.",
    "Used IKEA desk 120x60 with white top and silver legs. Pickup Lausanne. CHF 35. Good condition.",
    "Bureau d'occasion, chêne, à Ecublens. Prix CHF 45.",
    "Gebrauchter Schreibtisch mit Schubladen, CHF 55.",
    "Used designer desk in oak. Asking CHF 900.",
    "Used desk in Crissier. Asking CHF 40.",
  ].map((snippet, index) => ({
    id: `web-${index}`,
    title: "Desk",
    url: `https://www.ricardo.ch/fr/a/desk-${123456789 + index}/`,
    snippet,
  }));
  // The last source is an example from a product research search.
  const ids = new Set(offers.slice(0, -1).map(({ id }) => id));
  const proposal = researchedProposal(offers, ids, "research");
  assert.deepEqual(proposal?.patch, { price: 45 });
  assert.deepEqual(
    proposal.evidence.map((item) => item.kind === "source" && item.sourceId),
    ["web-0", "web-2", "web-3"],
  );
  assert.match(proposal.reason, /median of 3 used offers asking CHF 35–55/);
  assert.equal(
    researchedProposal([offers[0], offers[4]], ids, "split"),
    undefined,
  );
});
