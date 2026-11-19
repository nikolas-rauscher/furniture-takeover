import { AnimatePresence, motion } from "motion/react";
import { X } from "@/components/icons";
import Pako from "./onboarding/Pako";
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
  action?: ToastAction;
  onDismiss: () => void;
};

/** Pako brings a short note that springs up above the page and leaves on its own. */
export default function Toast({ message, action, onDismiss }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: 12,
            scale: 0.98,
            transition: { duration: 0.16 },
          }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        >
          <Pako mood="idle" size={34} className="toast-pako" />
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
