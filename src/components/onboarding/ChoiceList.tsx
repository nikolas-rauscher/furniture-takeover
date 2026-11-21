import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { Check } from "@/components/icons";
import type { IntroIcon } from "./onboardingIcons";

export type ChoiceTint = "sky" | "sand" | "butter";
export type ChoiceOption<Id extends string> = {
  id: Id;
  title: string;
  detail?: string;
  /** A tinted tile before the text; the study's plain answers go without. */
  tile?: { icon: IntroIcon; tint: ChoiceTint };
  /** A price card: the price under the title, the advantages under the detail. */
  plan?: { price: string; benefits: readonly string[] };
};
export type ChoiceListProps<Id extends string> = {
  /** The question, as the accessible name of the group. */
  label: string;
  options: ChoiceOption<Id>[];
  selected: Id[];
  multiple: boolean;
  layout: "list" | "grid" | "plans";
  onToggle: (id: Id) => void;
};

const MAX_STAGGER = 0.24;
/** Number keys 1–9 pick an option, so only the first nine show a key. */
const KEYED_OPTIONS = 9;
const ARROW_STEPS: Record<string, number> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};
const pop: Variants = {
  rest: { scale: 1 },
  picked: {
    scale: [1, 1.035, 1],
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
  },
};
const mark = {
  initial: { scale: 0.4, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.4, opacity: 0, transition: { duration: 0.1 } },
  transition: { type: "spring", stiffness: 520, damping: 24 },
} as const;

/** Answer cards on a lip: single choice as a radio group, multiple choice as toggles. */
export default function ChoiceList<Id extends string>({
  label,
  options,
  selected,
  multiple,
  layout,
  onToggle,
}: ChoiceListProps<Id>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // With reduced motion the cards arrive together, with the step's own fade.
  const reduced = useReducedMotion() === true;
  const focusable = multiple
    ? -1
    : Math.max(
        0,
        options.findIndex((option) => selected.includes(option.id)),
      );

  // A radio group moves focus and choice together with the arrow keys.
  function roveFrom(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    const step = ARROW_STEPS[event.key];
    if (multiple || !step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    buttons.current[next]?.focus();
    onToggle(options[next].id);
  }

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-label={label}
      className={`ob-choices ob-choices-${layout}`}
    >
      {options.map((option, index) => {
        const checked = selected.includes(option.id);
        return (
          <motion.div
            key={option.id}
            className="ob-choice-cell"
            data-plan={option.plan ? true : undefined}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 32,
              delay: Math.min(index * 0.04, MAX_STAGGER),
            }}
          >
            <motion.button
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              className="ob-choice"
              data-tint={option.tile?.tint}
              role={multiple ? undefined : "radio"}
              aria-checked={multiple ? undefined : checked}
              aria-pressed={multiple ? checked : undefined}
              tabIndex={multiple || index === focusable ? 0 : -1}
              initial={false}
              animate={checked ? "picked" : "rest"}
              variants={pop}
              onClick={() => onToggle(option.id)}
              onKeyDown={(event) => roveFrom(index, event)}
            >
              {option.tile && (
                <span className="ob-choice-tile">
                  <option.tile.icon size={24} strokeWidth={1.9} />
                </span>
              )}
              <span className="ob-choice-text">
                <span className="ob-choice-title">{option.title}</span>
                {option.plan && (
                  <span className="ob-choice-price">{option.plan.price}</span>
                )}
                {option.detail && (
                  <span className="ob-choice-detail">{option.detail}</span>
                )}
                {option.plan && (
                  <span className="ob-choice-benefits">
                    {option.plan.benefits.map((benefit) => (
                      <span key={benefit} className="ob-choice-benefit">
                        <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                        {benefit}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="ob-choice-mark" aria-hidden="true">
                <AnimatePresence initial={false} mode="popLayout">
                  {checked ? (
                    <motion.span
                      key="check"
                      className="ob-choice-check"
                      {...mark}
                    >
                      <Check size={14} strokeWidth={3} />
                    </motion.span>
                  ) : (
                    index < KEYED_OPTIONS && (
                      <motion.kbd key="key" className="ob-choice-key" {...mark}>
                        {index + 1}
                      </motion.kbd>
                    )
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          </motion.div>
        );
      })}
    </div>
  );
}
