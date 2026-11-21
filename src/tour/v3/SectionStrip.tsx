import { Package } from "@/components/icons";
import { useTourText } from "../i18n/TourLanguage";
import { sectionFill, sectionStates } from "./v3Flow";
import type { V3Progress } from "./v3Progress";
import { V3_SECTIONS, type V3Step } from "./v3Script";

/**
 * The four parts as four equal bars: a finished part is full and shows a taped box, the
 * current one fills with the steps done in it, the rest wait empty.
 */
export default function SectionStrip({
  answers,
  step,
}: {
  answers: V3Progress["answers"];
  step: V3Step;
}) {
  const { v3 } = useTourText();
  const states = sectionStates(step);
  const current = V3_SECTIONS.find((section) => states[section] === "current");
  const last = current === V3_SECTIONS[V3_SECTIONS.length - 1];
  return (
    <div className="tour-strip">
      <ol className="tour-strip-parts" aria-label={v3.progress}>
        {V3_SECTIONS.map((section) => {
          const state = states[section];
          const fill =
            state === "done"
              ? 1
              : state === "current"
                ? sectionFill(answers, step)
                : 0;
          return (
            <li
              key={section}
              className="tour-strip-part"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="sr-only">
                {v3.sectionState[state](v3.sections[section])}
              </span>
              <span
                className="tour-strip-fill"
                aria-hidden="true"
                style={{ width: `${fill * 100}%` }}
              />
              {state === "done" && (
                <span className="tour-strip-box" aria-hidden="true">
                  <Package size={12} strokeWidth={2.4} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {current && (
        <p className="tour-strip-name" aria-hidden="true">
          {last
            ? `${v3.lastPart} · ${v3.sections[current]}`
            : v3.sections[current]}
        </p>
      )}
    </div>
  );
}
