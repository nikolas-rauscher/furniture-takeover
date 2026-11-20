import type { PakoMood } from "@/components/onboarding/storyTypes";
import PhoneFrame from "../PhoneFrame";
import { SELLER_ANSWERS, TOUR_SCENES } from "../tourScenes";
import type { StepAnswer, StudyOption, StudyStep } from "../tourScript";
import ChoiceStep from "./ChoiceStep";
import ContactStep, { type ContactDraft } from "./ContactStep";
import DraftTask from "./DraftTask";
import TextAnswer from "./TextAnswer";

export type StepContentProps = {
  step: StudyStep;
  /** The step's options in the order shown. */
  options: StudyOption[];
  answer: StepAnswer;
  onAnswer: (answer: StepAnswer) => void;
  contact: ContactDraft;
  onContact: (contact: ContactDraft) => void;
  onMood: (mood: PakoMood) => void;
  onSceneDone: () => void;
};

/** The body of one study step; Pako's line and the buttons live in the shell. */
export default function StepContent({
  step,
  options,
  answer,
  onAnswer,
  contact,
  onContact,
  onMood,
  onSceneDone,
}: StepContentProps) {
  switch (step.kind) {
    case "single":
    case "multiple":
      return (
        <ChoiceStep
          question={step.question}
          options={options}
          multiple={step.kind === "multiple"}
          answer={answer}
          onChange={onAnswer}
        />
      );
    case "nearer-or-cheaper":
      return (
        <>
          <p className="ob-note">Same desk, same condition.</p>
          <ChoiceStep
            question={step.question}
            options={options}
            multiple={false}
            answer={answer}
            onChange={onAnswer}
          />
        </>
      );
    case "text":
      return (
        <TextAnswer
          label="Your answer (optional)"
          value={answer.text}
          onChange={(text) => onAnswer({ ...answer, text })}
        />
      );
    case "draft-check":
      return <DraftTask step={step} answer={answer} onChange={onAnswer} />;
    case "scene": {
      const Scene = TOUR_SCENES[step.act];
      return (
        <PhoneFrame label="Example screen of takeover">
          <Scene
            answers={SELLER_ANSWERS}
            onMood={onMood}
            onDone={onSceneDone}
          />
        </PhoneFrame>
      );
    }
    case "contact":
      return <ContactStep draft={contact} onChange={onContact} />;
    case "line":
    case "end":
      return null;
  }
}
