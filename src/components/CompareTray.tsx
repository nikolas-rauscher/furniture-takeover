import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, GitCompareArrows, X } from "@/components/icons";
import { Button } from "./ui/button";
import "./compare-tray.css";

type CompareTrayProps = {
  count: number;
  visible: boolean;
  onCompare: () => void;
  onClear: () => void;
};

/** Floats above the page while listings are picked for a side-by-side comparison. */
export default function CompareTray({
  count,
  visible,
  onCompare,
  onClear,
}: CompareTrayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="compare-tray"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.16 } }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          <span className="compare-tray-count">
            <GitCompareArrows size={18} aria-hidden="true" />
            <motion.strong
              key={count}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 18 }}
            >
              {count}
            </motion.strong>
            selected
          </span>
          <Button
            animateIcon
            className="button primary small"
            disabled={count < 2}
            title={count < 2 ? "Select one more listing to compare" : undefined}
            onClick={onCompare}
          >
            Compare
            <ArrowRight size={14} />
          </Button>
          <Button
            className="icon-button"
            aria-label="Clear comparison"
            onClick={onClear}
          >
            <X size={16} />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
