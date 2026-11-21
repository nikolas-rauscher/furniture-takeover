import type { OnboardingOutcome } from "./onboardingFlow.ts";

/** After the intro, focus returns to its help button, or moves to the page the intro opened. */
export function introFocusTarget(
  outcome: OnboardingOutcome,
  helpButton: HTMLElement | null,
  page: HTMLElement | null,
) {
  return outcome.next === "dismiss" || outcome.next === "explore"
    ? helpButton
    : page;
}
