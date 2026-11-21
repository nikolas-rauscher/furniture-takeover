import { useId } from "react";
import { useTourText } from "../i18n/TourLanguage";
import ChoiceStep from "../study/ChoiceStep";
import type { StepContext } from "./stepContext";
import type { V3ChoiceStep, V3Step } from "./v3Script";
import { optionsOf, questionOf } from "./v3Words";

type AboutStep = Extract<V3Step, { kind: "about" }>;

function Row({ row, context }: { row: V3ChoiceStep; context: StepContext }) {
  const text = useTourText();
  const titleId = useId();
  const question = questionOf(text, row, context.progress.answers);
  return (
    <section className="tour-about-row" aria-labelledby={titleId}>
      <h2 id={titleId} className="tour-row-title">
        {question}
      </h2>
      <ChoiceStep
        question={question}
        options={optionsOf(text, row, context.progress)}
        multiple={false}
        layout="grid"
        answer={{ ...context.given[row.id], shown: [] }}
        onChange={({ chosen, text: words }, moved) =>
          context.answer(row.id, { chosen, text: words }, moved)
        }
      />
    </section>
  );
}

/** "About you": two optional rows of chips; a row left empty is saved as skipped. */
export default function AboutRows({
  step,
  context,
}: {
  step: AboutStep;
  context: StepContext;
}) {
  return (
    <div className="tour-about">
      {step.rows.map((row) => (
        <Row key={row.id} row={row} context={context} />
      ))}
    </div>
  );
}
