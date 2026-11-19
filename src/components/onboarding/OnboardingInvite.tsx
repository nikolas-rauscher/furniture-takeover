import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { X } from "@/components/icons";
import { Button } from "../ui/button";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import Pako from "./Pako";
import "./onboarding.css";
import "./celebration.css";

/** The card waits a moment, so it never competes with the first look at the page. */
const APPEAR_DELAY_MS = 1200;
/** From this width the card rests beside the home headline instead of the corner. */
const ANCHORED_QUERY = "(min-width: 1024px)";

type Choice = "start" | "dismiss";

/** Desktop opt-in for the intro: a compact card that offers the tour without covering a listing. */
export default function OnboardingInvite({
  onStart,
  onDismiss,
}: {
  onStart: () => void;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const [shown, setShown] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  // It arrives from the edge it rests against: down from the header, or up from the corner.
  const away = useMediaQuery(ANCHORED_QUERY) ? -12 : 16;
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  const inviting = shown && choice === null;
  return (
    <MotionConfig reducedMotion="user">
      {/* Present from the start, so the card is announced politely once it appears. */}
      <p className="sr-only" role="status">
        {inviting
          ? "New to takeover? Pako can show you how it works in about a minute."
          : ""}
      </p>
      <AnimatePresence
        onExitComplete={() => (choice === "start" ? onStart() : onDismiss())}
      >
        {inviting && (
          <motion.aside
            key="invite"
            className="ob-invite"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: away, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 320, damping: 26 },
            }}
            exit={{
              opacity: 0,
              y: away / 2,
              scale: 0.97,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
            }}
          >
            <Pako className="ob-invite-pako" mood="wave" size={40} />
            <div className="ob-invite-text">
              <h2 id={titleId} className="ob-invite-title">
                New to takeover?
              </h2>
              <p className="ob-invite-note">A one-minute tour.</p>
            </div>
            <Button
              className="button primary small"
              onClick={() => setChoice("start")}
            >
              Show me
            </Button>
            <Button
              className="icon-button ob-invite-dismiss"
              aria-label="Not now"
              title="Not now"
              onClick={() => setChoice("dismiss")}
            >
              <X size={16} aria-hidden="true" />
            </Button>
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
