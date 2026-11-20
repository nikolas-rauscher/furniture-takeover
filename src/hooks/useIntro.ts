import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { OnboardingOutcome } from "../components/onboarding/Onboarding";
import {
  firstVisitModeHere,
  readOnboarding,
  rememberOnboarding,
  type OnboardingMode,
} from "../components/onboarding/onboardingStorage";

/**
 * The intro: offered on a first visit, open from the header, and the answers
 * it remembers. An intro that ended before the marketplace loaded is applied once.
 */
export function useIntro({
  outcome,
  onComplete,
}: {
  /** How the intro shown before the marketplace loaded ended. */
  outcome: OnboardingOutcome | undefined;
  onComplete: (outcome: OnboardingOutcome) => void;
}) {
  const [record] = useState(readOnboarding);
  const [mode, setMode] = useState<OnboardingMode>(() =>
    outcome ? "closed" : firstVisitModeHere(record),
  );
  const applyOutcome = useEffectEvent(onComplete);
  const applied = useRef(false);
  useEffect(() => {
    if (!outcome || applied.current) return;
    applied.current = true;
    applyOutcome(outcome);
  }, [outcome]);
  return {
    /** The visitor's earlier answers, such as where they live. */
    record,
    mode,
    open: () => setMode("open"),
    close: () => setMode("closed"),
    decline() {
      rememberOnboarding({});
      setMode("closed");
    },
  };
}
