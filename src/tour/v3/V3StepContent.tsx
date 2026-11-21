import DeviceFrame from "../device/DeviceFrame";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import ChoiceStep from "../study/ChoiceStep";
import { SaveStatus } from "../study/StudyEnd";
import TextAnswer from "../study/TextAnswer";
import AboutRows from "./AboutRows";
import DeskTask from "./DeskTask";
import DraftChat from "./DraftChat";
import PackLadder from "./PackLadder";
import PartCard from "./PartCard";
import PilotForm from "./PilotForm";
import type { Given, StepContext } from "./stepContext";
import {
  SITUATIONS,
  STORY_MAX,
  type V3ChoiceStep,
  type V3Step,
} from "./v3Script";
import WantedCard from "./WantedCard";
import WhatIsTakeover from "./WhatIsTakeover";
import { optionsOf, questionOf } from "./v3Words";
import V3End from "./V3End";

/** One choice, the card some questions show first, and the note after a pick. */
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
      {step.id === "sending" && (
        <figure className="tour-card tour-quote">
          <figcaption className="tour-eyebrow">
            {text.v3.whoSendsCard.title}
          </figcaption>
          <blockquote>{text.v3.whoSendsCard.sentence}</blockquote>
        </figure>
      )}
      {step.id === "wanted-react" && <WantedCard />}
      <ChoiceStep
        question={questionOf(text, step, context.progress.answers)}
        options={options}
        layout={step.id === "pay-model" ? "plans" : "list"}
        multiple={step.multiple ?? false}
        answer={{ ...answer, shown: [] }}
        onChange={({ chosen, text: words }, moved) =>
          context.answer(step.id, { chosen, text: words }, moved)
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

/** The situation's one sentence, as the step's context card tells it. */
function scenarioOf(step: V3Step, text: TourText["v3"]["situations"]) {
  switch (step.id) {
    case "move-it":
    case "desk":
    case "draft":
      return text[step.id];
    default:
      throw new Error(`Step ${step.id} is not a situation.`);
  }
}

/** Opens each situation: which one it is, the scenario, and what to do. */
function SituationCard({ step, place }: { step: V3Step; place: number }) {
  const { situations } = useTourText().v3;
  return (
    <div className="tour-card tour-situation">
      <p className="tour-eyebrow">{situations.label(place, SITUATIONS)}</p>
      <p className="tour-situation-text">{scenarioOf(step, situations)}</p>
      <p className="tour-situation-task">
        {step.kind === "draft" ? situations.draftTask : situations.pickOne}
      </p>
    </div>
  );
}

/** The body of one v3 step, opened by its context card when it is a situation. */
export default function V3StepContent({ context }: { context: StepContext }) {
  const { step } = context;
  if (step.situation === undefined) return <StepBody context={context} />;
  return (
    <>
      <SituationCard step={step} place={step.situation} />
      <StepBody context={context} />
    </>
  );
}

/** Pako's line and the main buttons live in the shell. */
function StepBody({ context }: { context: StepContext }) {
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
    case "ladder":
      return <PackLadder context={context} />;
    case "about-app":
      return <WhatIsTakeover />;
    case "part":
      return <PartCard section={step.section} />;
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
          brief={step.brief}
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
