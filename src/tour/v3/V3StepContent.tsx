import DeviceFrame from "../device/DeviceFrame";
import { useTourText } from "../i18n/TourLanguage";
import ChoiceStep from "../study/ChoiceStep";
import DraftChat from "./DraftChat";
import MoreBelow from "./MoreBelow";
import PartCard from "./PartCard";
import type { StepContext } from "./stepContext";
import type { V3ChoiceStep } from "./v3Script";
import WantedPost from "./WantedPost";
import { optionsOf, questionOf } from "./v3Words";
import V3End from "./V3End";

/**
 * One choice. A step with a card has its context in Pako's line, so its question
 * stands here, right above the answers; the price cards say first that they are examples.
 */
function ChoiceContent({
  step,
  context,
}: {
  step: V3ChoiceStep;
  context: StepContext;
}) {
  const text = useTourText();
  const question = questionOf(text, step);
  const plans = step.id === "pay-model";
  return (
    <>
      {step.id === "wanted-react" && <WantedPost />}
      {step.card && <h2 className="tour-question">{question}</h2>}
      {plans && <p className="tour-eyebrow">{text.v3.plans.label}</p>}
      {step.multiple && !step.card && (
        <p className="tour-hint">{text.v3.chooseSeveral}</p>
      )}
      <ChoiceStep
        question={question}
        options={optionsOf(text, step, context.progress)}
        layout={plans ? "plans" : "list"}
        multiple={step.multiple ?? false}
        answer={{ ...context.given[step.id], shown: [] }}
        onChange={({ chosen, text: words }, moved) =>
          context.answer(step.id, { chosen, text: words }, moved)
        }
      />
      <MoreBelow last=".ob-choices > .ob-choice-cell:last-child" />
    </>
  );
}

/** The scenario of the draft task and what to do in it. */
function DraftCard() {
  const { draft } = useTourText().v3;
  return (
    <div className="tour-card tour-situation">
      <p className="tour-situation-text">{draft.scenario}</p>
      <p className="tour-situation-task">{draft.task}</p>
    </div>
  );
}

/** The body of one step; Pako's line and the main buttons live in the shell. */
export default function V3StepContent({ context }: { context: StepContext }) {
  const text = useTourText();
  const { step } = context;
  switch (step.kind) {
    case "choice":
      return <ChoiceContent step={step} context={context} />;
    case "draft":
      return (
        <>
          <DraftCard />
          <DraftChat context={context} />
        </>
      );
    case "part":
      return <PartCard section={step.section} />;
    case "scene":
      return (
        <>
          <p className="tour-eyebrow tour-scene-note">
            {text.v3.sceneInEnglish}
          </p>
          <DeviceFrame
            key={step.id}
            label={text.scenes[step.scene].label}
            scene={step.scene}
            brief
            replay={context.scene.replay}
            onMood={context.onMood}
            onDone={context.sceneDone}
          />
        </>
      );
    case "end":
      return <V3End context={context} />;
  }
}
