import { motion } from "motion/react";
import { Package } from "@/components/icons";
import { useTourText } from "../i18n/TourLanguage";
import { sectionStates } from "./v3Flow";
import { V3_SECTIONS, type V3Step } from "./v3Script";

/**
 * The four parts of the core as a strip: a part still open is a bar, a finished
 * part closes into a small taped box, the same for whatever was answered.
 */
export default function SectionStrip({ step }: { step: V3Step }) {
  const { v3 } = useTourText();
  const states = sectionStates(step);
  const current = V3_SECTIONS.find((section) => states[section] === "current");
  return (
    <div className="tour-strip">
      <ol className="tour-strip-parts" aria-label={v3.progress}>
        {V3_SECTIONS.map((section) => {
          const state = states[section];
          const name = v3.sections[section];
          return (
            <motion.li
              key={section}
              layout
              className="tour-strip-part"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <span className="sr-only">{v3.sectionState[state](name)}</span>
              {state === "done" && (
                <motion.span
                  className="tour-strip-box"
                  aria-hidden="true"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Package size={14} strokeWidth={2.2} />
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ol>
      {current && (
        <p className="tour-strip-name" aria-hidden="true">
          {v3.sections[current]}
        </p>
      )}
    </div>
  );
}
