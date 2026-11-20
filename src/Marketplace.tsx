import { useEffect, useState } from "react";
import type { AccountConnection } from "./cloud/connection";
import type { OnboardingOutcome } from "./components/onboarding/onboardingFlow";
import { opensWithIntro } from "./firstScreen";
import { introFocusTarget } from "./components/onboarding/introFocus";
import LazyBoundary from "./components/LazyBoundary";
import { lazyScreen } from "./lazyScreen";
import { Onboarding } from "./screens";
import { whenIdle } from "./whenIdle";

const App = lazyScreen(() => import("./App"));

/** Shown until the first screen's code has arrived. */
export function BootStatus() {
  return (
    <p style={{ padding: 32 }} role="status">
      Loading takeover…
    </p>
  );
}

function warnPrefetchFailure(error: unknown) {
  console.warn("Could not prefetch the marketplace.", error);
}

/** The intro's focus target, found on the page once the marketplace behind it has rendered. */
function introFocus(outcome: OnboardingOutcome) {
  return introFocusTarget(
    outcome,
    document.querySelector<HTMLElement>(".help-nav"),
    document.querySelector<HTMLElement>(".main-content"),
  );
}

type MarketplaceProps = {
  account?: AccountConnection;
  /** Holds the intro back while another first-visit dialog is open. */
  onboardingPaused: boolean;
};

/**
 * The marketplace, or on a phone's first visit the intro alone: the marketplace's code
 * loads while the intro plays and mounts once the intro ends, opening what it chose.
 */
export default function Marketplace({
  account,
  onboardingPaused,
}: MarketplaceProps) {
  const [introOpen, setIntroOpen] = useState(
    () => !onboardingPaused && opensWithIntro(),
  );
  const [outcome, setOutcome] = useState<OnboardingOutcome>();
  useEffect(() => {
    if (introOpen)
      return whenIdle(() => App.prefetch().catch(warnPrefetchFailure));
  }, [introOpen]);
  return (
    <>
      {(!introOpen || outcome) && (
        <LazyBoundary label="Loading takeover" placeholder={<BootStatus />}>
          <App
            account={account}
            onboardingPaused={onboardingPaused}
            introOutcome={outcome}
          />
        </LazyBoundary>
      )}
      {introOpen && (
        <LazyBoundary label="Loading the intro" placeholder={<BootStatus />}>
          <Onboarding
            accountAction={Boolean(account && !account.session)}
            onComplete={setOutcome}
            finalFocus={introFocus}
            onClosed={() => setIntroOpen(false)}
          />
        </LazyBoundary>
      )}
    </>
  );
}
