import type { AgentQuestionEvent } from "../../shared/actions";
import { Button } from "./ui/button";

/** The student answered these by editing the field itself, so there is nothing to undo here. */
const SETTLED_ANSWERS = new Set(["Set in details"]);

const ROW_NAMES: Partial<Record<string, string>> = {
  price: "Price",
  condition: "Condition",
  dimensions: "Measurements",
  pickup: "Pickup",
};

/** The student's answers to Pako's questions in this turn, each with its Undo. */
export default function ListingAnswers({
  questions,
  answers,
  onUndo,
}: {
  questions: readonly AgentQuestionEvent[];
  answers: Readonly<Record<string, string>>;
  /** Absent for earlier turns, whose answers stay as they are. */
  onUndo?: (questionId: string) => void;
}) {
  const answered = questions.filter((question) => answers[question.id]);
  if (!answered.length) return null;
  return (
    <section className="listing-answers" aria-label="Your answers">
      <dl>
        {answered.map((question) => {
          const name =
            ROW_NAMES[question.listingField ?? ""] ?? question.question;
          const answer = answers[question.id];
          return (
            <div key={question.id}>
              <dt>{name}</dt>
              <dd>{answer}</dd>
              {onUndo && !SETTLED_ANSWERS.has(answer) && (
                <Button
                  className="button quiet small"
                  aria-label={`Undo ${name}: ${answer}`}
                  onClick={() => onUndo(question.id)}
                >
                  Undo
                </Button>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
