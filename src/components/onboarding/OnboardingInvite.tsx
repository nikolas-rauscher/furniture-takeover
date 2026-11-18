import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { Button } from "../ui/button";
import Pako from "./Pako";
import "./onboarding.css";
import "./celebration.css";

/** The card waits a moment, so it never competes with the first look at the page. */
const APPEAR_DELAY_MS = 1200;

type Choice = "start" | "dismiss";

/** Desktop opt-in for the intro: a small card that offers the tour without blocking the page. */
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
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence
        onExitComplete={() => (choice === "start" ? onStart() : onDismiss())}
      >
        {shown && choice === null && (
          <motion.aside
            key="invite"
            className="ob-invite"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 300, damping: 24 },
            }}
            exit={{
              opacity: 0,
              y: 16,
              scale: 0.97,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
            }}
          >
            <Pako className="ob-invite-pako" mood="wave" size={72} />
            <h2 id={titleId} className="ob-invite-title">
              New to takeover?
            </h2>
            <p className="ob-invite-text">
              Pako shows you how it works. It takes about a minute.
            </p>
            <div className="ob-invite-actions">
              <Button className="ob-button" onClick={() => setChoice("start")}>
                Show me
              </Button>
              <Button
                className="ob-button quiet"
                onClick={() => setChoice("dismiss")}
              >
                Not now
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
