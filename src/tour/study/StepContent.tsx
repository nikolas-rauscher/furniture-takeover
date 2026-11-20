import type { PakoMood } from "@/components/onboarding/storyTypes";
import DeviceFrame from "../device/DeviceFrame";
import { useTourText } from "../i18n/TourLanguage";
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
  const text = useTourText();
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
          <p className="ob-note">{text.v1.sameDesk}</p>
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
          label={text.common.optional}
          value={answer.text}
          onChange={(text) => onAnswer({ ...answer, text })}
        />
      );
    case "draft-check":
      return <DraftTask step={step} answer={answer} onChange={onAnswer} />;
    case "scene":
      return (
        <DeviceFrame
          key={step.id}
          label={text.scenes[step.scene].label}
          scene={step.scene}
          onMood={onMood}
          onDone={onSceneDone}
        />
      );
    case "contact":
      return <ContactStep draft={contact} onChange={onContact} />;
    case "line":
    case "end":
      return null;
  }
}
