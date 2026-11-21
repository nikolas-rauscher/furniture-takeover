import ChoiceList, {
  type ChoiceOption,
} from "@/components/onboarding/ChoiceList";
import { useTourText } from "../i18n/TourLanguage";
import { toggleOption } from "../optionOrder";
import type { StepAnswer, StudyOption } from "../tourScript";
import { useArrowMoves } from "./arrowMoves";
import TextAnswer from "./TextAnswer";

function choiceOptions(options: StudyOption[]): ChoiceOption<string>[] {
  return options.map(({ id, label, detail, plan }) => ({
    id,
    title: label,
    detail,
    plan,
  }));
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
  layout = "list",
}: {
  question: string;
  /** In the order shown. */
  options: StudyOption[];
  multiple: boolean;
  answer: StepAnswer;
  /** `moved` is set when the arrow keys moved the selection, which is not a pick. */
  onChange: (answer: StepAnswer, moved: boolean) => void;
  /** Short answers such as age bands sit side by side; ways of paying are price cards. */
  layout?: "list" | "grid" | "plans";
}) {
  const text = useTourText();
  const arrows = useArrowMoves();
  const withText = options.find(
    (option) => option.withText && answer.chosen.includes(option.id),
  );
  return (
    <>
      {/* Hears the keys before the list does, without a box of its own. */}
      <div
        style={{ display: "contents" }}
        onKeyDownCapture={arrows.onKeyDownCapture}
      >
        <ChoiceList
          label={question}
          options={choiceOptions(options)}
          selected={answer.chosen}
          multiple={multiple}
          layout={layout}
          onToggle={(id) =>
            onChange(
              pickOption(options, answer, id, multiple),
              arrows.takeMoved(),
            )
          }
        />
      </div>
      {withText && (
        <TextAnswer
          label={withText.textLine ?? text.common.inAFewWords(withText.label)}
          singleLine={withText.textLine !== undefined}
          value={answer.text}
          onChange={(text) => onChange({ ...answer, text }, false)}
        />
      )}
    </>
  );
}
