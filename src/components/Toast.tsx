import { AnimatePresence, motion } from "motion/react";
import { X } from "@/components/icons";
import Pako from "./onboarding/Pako";
import type { PakoMood } from "./onboarding/storyTypes";
import { Button } from "./ui/button";
import "./toast.css";

export type ToastAction = {
  label: string;
  /** Names the action for assistive technology, e.g. "Undo saved search deletion". */
  description: string;
  onClick: () => void;
};

type ToastProps = {
  /** An empty message hides the toast. */
  message: string;
  /** Pages with a composer or main action at the bottom take notes under the header. */
  placement: "top" | "bottom";
  /** How Pako brings the note: calm by default, in love when a favourite is saved. */
  mood?: PakoMood;
  action?: ToastAction;
  onDismiss: () => void;
};

/** Pako brings a short note that springs in over the page and leaves on its own. */
export default function Toast({
  message,
  placement,
  mood = "idle",
  action,
  onDismiss,
}: ToastProps) {
  // It springs in from the edge it rests against and leaves the same way.
  const away = placement === "top" ? -1 : 1;
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          className="toast"
          data-placement={placement}
          role="status"
          initial={{ opacity: 0, y: 24 * away, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: 12 * away,
            scale: 0.98,
            transition: { duration: 0.16 },
          }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <Pako mood={mood} size={34} className="toast-pako" />
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
