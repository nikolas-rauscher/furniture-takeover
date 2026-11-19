import { AnimatePresence, motion } from "motion/react";
import { Button } from "./ui/button";
import "./database-status.css";

type DatabaseStatusProps = {
  /** What the listings are waiting for or what went wrong; empty when all is well. */
  message: string;
  /** Offered when loading failed. */
  onRetry?: () => void;
};

/** News about the listings floats under the header, so it never moves the page. */
export default function DatabaseStatus({
  message,
  onRetry,
}: DatabaseStatusProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="database-status"
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {message}
          {onRetry && (
            <Button className="text-button" onClick={onRetry}>
              Retry
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
