import DeviceFrame from "../device/DeviceFrame";
import { useTourText } from "../i18n/TourLanguage";
import ChoiceStep from "../study/ChoiceStep";
import { SaveStatus } from "../study/StudyEnd";
import TextAnswer from "../study/TextAnswer";
import AboutRows from "./AboutRows";
import DeskTask from "./DeskTask";
import DraftChat from "./DraftChat";
import PilotForm from "./PilotForm";
import RevealContent from "./RevealContent";
import type { Given, StepContext } from "./stepContext";
import { STORY_MAX, type V3ChoiceStep } from "./v3Script";
import { optionsOf, questionOf } from "./v3Words";
import V3End from "./V3End";

/** One choice, Pako's card for the who-sends question, and the note after a pick. */
function ChoiceContent({
  step,
  context,
}: {
  step: V3ChoiceStep;
  context: StepContext;
}) {
  const text = useTourText();
  const answer = context.given[step.id];
  const options = optionsOf(text, step, context.progress);
  return (
    <>
      {step.id === "who-sends" && (
        <figure className="tour-card tour-quote">
          <figcaption className="tour-eyebrow">
            {text.v3.whoSendsCard.title}
          </figcaption>
          <blockquote>{text.v3.whoSendsCard.sentence}</blockquote>
        </figure>
      )}
      <ChoiceStep
        question={questionOf(text, step)}
        options={options}
        multiple={false}
        answer={{ ...answer, shown: [] }}
        onChange={({ chosen, text: words }) =>
          context.answer(step.id, { chosen, text: words })
        }
      />
      <p className="tour-disclosure" role="status">
        {step.disclosure && answer.chosen.length > 0
          ? text.v3[step.disclosure]
          : ""}
      </p>
    </>
  );
}

function SavedContent({ context }: { context: StepContext }) {
  const { v3 } = useTourText();
  const saving = context.save.unsaved.length > 0;
  return (
    <div className="ob-welcome tour-end">
      <h2 className="ob-title">{saving ? v3.savedSaving : v3.saved}</h2>
      <div role="status">
        <SaveStatus save={context.save} onRetry={context.retry} />
      </div>
    </div>
  );
}

/** The body of one v3 step; Pako's line and the main buttons live in the shell. */
export default function V3StepContent({ context }: { context: StepContext }) {
  const text = useTourText();
  const { step } = context;
  const story = (answer: Given) => context.answer(step.id, answer);
  switch (step.kind) {
    case "choice":
      return <ChoiceContent step={step} context={context} />;
    case "story":
      return (
        <TextAnswer
          label={text.v3.lastStory.label}
          placeholder={text.v3.lastStory.placeholder}
          max={STORY_MAX}
          value={context.given[step.id].text}
          onChange={(words) => story({ chosen: [], text: words })}
        />
      );
    case "desk":
      return <DeskTask step={step} context={context} />;
    case "draft":
      return <DraftChat context={context} />;
    case "reveal":
      return <RevealContent context={context} />;
    case "saved":
      return <SavedContent context={context} />;
    case "about":
      return <AboutRows step={step} context={context} />;
    case "scene":
      return (
        <DeviceFrame
          key={step.id}
          label={text.scenes[step.scene].label}
          scene={step.scene}
          replay={context.scene.replay}
          onMood={context.onMood}
          onDone={context.sceneDone}
          onMoment={context.sceneMoment}
        />
      );
    case "pilot":
      return <PilotForm context={context} />;
    case "end":
      return <V3End context={context} />;
  }
}
