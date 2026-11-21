import test from "node:test";
import assert from "node:assert/strict";
import { applyDealAction, type Deal } from "./deal.ts";
import { dealScenarios } from "./dealScenarios.ts";
for (const scenario of dealScenarios)
  test(scenario.name, () => {
    let deal: Deal | null = null;
    let listingStatus: "active" | "reserved" | "sold" = "active";
    for (const step of scenario.steps) {
      const apply = () =>
        applyDealAction({
          deal,
          ...step,
          now: new Date("2026-11-19T10:00:00Z"),
          conversationId: "thread",
          listingId: "desk",
          listingStatus,
        });
      if (step.error) assert.throws(apply, new RegExp(step.error));
      else {
        const result = apply();
        assert.equal(result.event.kind, step.kind);
        assert.equal(result.statusChange, step.statusChange);
        deal = result.deal;
        listingStatus = result.statusChange ?? listingStatus;
      }
    }
  });
