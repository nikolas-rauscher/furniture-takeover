import { useEffect, useRef } from "react";
import { useTourText } from "../i18n/TourLanguage";
import ChoiceStep from "../study/ChoiceStep";
import type { StudyOption } from "../tourScript";
import { ladderOf } from "./packPricing";
import type { StepContext } from "./stepContext";
import { PACK_ANSWERS } from "./v3Script";

/**
 * The move-out pack at one or two prices, one question at a time on the same
 * screen. Each answer is stored at once; the ladder's answers are final, so a
 * participant who comes back sees the note instead of the questions again.
 */
export default function PackLadder({ context }: { context: StepContext }) {
  const { v3 } = useTourText();
  const words = v3.packLadder;
  const ladder = ladderOf(context.progress);
  const question = useRef<HTMLDivElement>(null);
  const options: StudyOption[] = PACK_ANSWERS.map((id) => ({
    id,
    label: words.options[id],
  }));

  // The follow-up price is a new question: it takes the focus, so it is read out.
  useEffect(() => {
    if (ladder.asked.length > 0 && ladder.next !== null)
      question.current?.focus({ preventScroll: true });
  }, [ladder.asked.length, ladder.next]);

  return (
    <div className="tour-ladder">
      <div className="tour-card tour-situation">
        <p className="tour-eyebrow">{words.title}</p>
        <p className="tour-situation-text">{words.text}</p>
      </div>
      {ladder.next === null ? (
        <p className="tour-disclosure" role="status">
          {v3.packMissing}
        </p>
      ) : (
        <div ref={question} tabIndex={-1} key={ladder.next}>
          <ChoiceStep
            question={words.question(ladder.next)}
            options={options}
            multiple={false}
            answer={{ ...context.given[context.step.id], shown: [] }}
            onChange={({ chosen }, moved) => {
              // The arrow keys only select; a tap, Space, Enter or Continue answers.
              if (moved)
                context.answer(context.step.id, { chosen, text: "" }, true);
              else context.answerLadder(chosen[0]);
            }}
          />
        </div>
      )}
    </div>
  );
}
