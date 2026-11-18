import { motion, type MotionProps } from "motion/react";
import {
  doneCopy,
  itemById,
  placeById,
  type CompleteAnswers,
} from "./onboardingContent";
import { itemIcons, placeIcons, type IntroIcon } from "./onboardingIcons";
import "./celebration.css";

const STAGGER_S = 0.06;
const MAX_DELAY_S = 0.42;

/** Springs one element in, a little after the one before it. */
function popIn(
  order: number,
): Pick<MotionProps, "initial" | "animate" | "transition"> {
  return {
    initial: { opacity: 0, y: 12, scale: 0.92 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      type: "spring",
      stiffness: 420,
      damping: 26,
      delay: Math.min(order * STAGGER_S, MAX_DELAY_S),
    },
  };
}

type SummaryChip = { key: string; label: string; Icon: IntroIcon };

/** The visitor's place first, then every item they picked. */
function summaryChips(answers: CompleteAnswers): SummaryChip[] {
  const place = placeById(answers.place);
  const picked = answers.items.map((id) => ({
    key: id,
    label: itemById(id).label,
    Icon: itemIcons[id],
  }));
  return [
    { key: place.id, label: place.name, Icon: placeIcons[place.kind] },
    ...picked,
  ];
}

export default function Celebration({
  answers,
  headingId,
}: {
  answers: CompleteAnswers;
  headingId: string;
}) {
  const copy = doneCopy(answers);
  return (
    <div className="ob-done">
      <motion.h2 id={headingId} className="ob-title" {...popIn(0)}>
        {copy.title}
      </motion.h2>
      <motion.p className="ob-lead ob-done-text" {...popIn(1)}>
        {copy.text}
      </motion.p>
      <ul className="ob-done-chips" aria-label="Your answers">
        {summaryChips(answers).map(({ key, label, Icon }, index) => (
          <motion.li key={key} className="ob-chip" {...popIn(index + 2)}>
            <span className="ob-done-chip-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={2} />
            </span>
            {label}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
