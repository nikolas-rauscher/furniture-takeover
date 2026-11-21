import type { OnboardingOutcome } from "../components/onboarding/Onboarding";
import OnboardingInvite from "../components/onboarding/OnboardingInvite";
import type { OnboardingMode } from "../components/onboarding/onboardingStorage";
import LazyBoundary from "../components/LazyBoundary";
import { Onboarding } from "../screens";

/** The intro over the app, or the invitation to it on a first visit. */
export default function IntroLayer({
  mode,
  paused,
  accountAction,
  onComplete,
  finalFocus,
  intro,
}: {
  mode: OnboardingMode;
  /** Another first-visit dialog is open. */
  paused: boolean;
  /** The intro offers signing in. */
  accountAction: boolean;
  onComplete: (outcome: OnboardingOutcome) => void;
  finalFocus: (outcome: OnboardingOutcome) => HTMLElement | null;
  intro: { open: () => void; close: () => void; decline: () => void };
}) {
  if (paused) return null;
  if (mode === "open")
    return (
      <LazyBoundary label="Loading the intro" placeholder={null}>
        <Onboarding
          accountAction={accountAction}
          onComplete={onComplete}
          finalFocus={finalFocus}
          onClosed={intro.close}
        />
      </LazyBoundary>
    );
  if (mode === "invite")
    return <OnboardingInvite onStart={intro.open} onDismiss={intro.decline} />;
  return null;
}
