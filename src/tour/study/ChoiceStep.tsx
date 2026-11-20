import ChoiceList, {
  type ChoiceOption,
} from "@/components/onboarding/ChoiceList";
import { toggleOption } from "../optionOrder";
import type { StepAnswer, StudyOption } from "../tourScript";
import TextAnswer from "./TextAnswer";

function choiceOptions(options: StudyOption[]): ChoiceOption<string>[] {
  return options.map(({ id, label, detail }) => ({ id, title: label, detail }));
}

/** The answer after tapping an option; the text goes once no option asks for it. */
export function pickOption(
  options: StudyOption[],
  answer: StepAnswer,
  id: string,
  multiple: boolean,
): StepAnswer {
  const chosen = multiple ? toggleOption(options, answer.chosen, id) : [id];
  const keepsText = options.some(
    (option) => option.withText && chosen.includes(option.id),
  );
  return { ...answer, chosen, text: keepsText ? answer.text : "" };
}

/** Single or multiple choice; an option with a text field opens it once picked. */
export default function ChoiceStep({
  question,
  options,
  multiple,
  answer,
  onChange,
}: {
  question: string;
  /** In the order shown. */
  options: StudyOption[];
  multiple: boolean;
  answer: StepAnswer;
  onChange: (answer: StepAnswer) => void;
}) {
  const withText = options.find(
    (option) => option.withText && answer.chosen.includes(option.id),
  );
  return (
    <>
      <ChoiceList
        label={question}
        options={choiceOptions(options)}
        selected={answer.chosen}
        multiple={multiple}
        layout="list"
        onToggle={(id) => onChange(pickOption(options, answer, id, multiple))}
      />
      {withText && (
        <TextAnswer
          label={`${withText.label}: in a few words (optional)`}
          value={answer.text}
          onChange={(text) => onChange({ ...answer, text })}
        />
      )}
    </>
  );
}
