import { AnimatePresence, motion } from "motion/react";
import { X } from "@/components/icons";
import { useMomentPassed } from "../hooks/useMomentPassed";
import Pako from "./onboarding/Pako";
import type { PakoMood } from "./onboarding/storyTypes";
import { Button } from "./ui/button";
import "./toast.css";

/** How long Pako shows how he feels about the news before he rests. */
const REACTION_MS = 1800;

export type ToastAction = {
  label: string;
  /** Names the action for assistive technology, e.g. "Undo saved search deletion". */
  description: string;
  onClick: () => void;
};

type ToastProps = {
  /** An empty message hides the toast. */
  message: string;
  /**
   * Pages with a composer or main action at the bottom keep it free: notes rest above a
   * conversation's composer, elsewhere under the header.
   */
  placement: "top" | "bottom";
  /** How Pako brings the note: calm by default, in love when a favourite is saved. */
  mood?: PakoMood;
  action?: ToastAction;
  onDismiss: () => void;
};

/** Pako reacts to the news once, then rests for as long as the note stays. */
function ToastPako({ mood }: { mood: PakoMood }) {
  const rested = useMomentPassed({ id: mood, ms: REACTION_MS });
  return (
    <Pako mood={rested ? "idle" : mood} size={34} className="toast-pako" />
  );
}

/** Pako brings a short note that springs in over the page and leaves on its own. */
export default function Toast({
  message,
  placement,
  mood = "idle",
  action,
  onDismiss,
}: ToastProps) {
  // It pops up solid, growing out of the edge it rests against, so it stays clear of
  // the tab bar and the page never shows through it; it fades only as it leaves.
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          className="toast"
          data-placement={placement}
          role="status"
          initial={{ scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 0.97,
            transition: { duration: 0.16 },
          }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <ToastPako mood={mood} />
          <span className="toast-message">{message}</span>
          {action && (
            <Button
              className="toast-action"
              aria-label={action.description}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          <Button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={onDismiss}
          >
            <X size={14} />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
