import {
  firstVisitModeHere,
  readOnboarding,
} from "./components/onboarding/onboardingStorage";

/** A phone's first visit to home opens with the intro, before the marketplace loads. */
export function opensWithIntro() {
  return firstVisitModeHere(readOnboarding()) === "open";
}
