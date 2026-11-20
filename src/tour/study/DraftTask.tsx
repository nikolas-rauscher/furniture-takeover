import { useState } from "react";
import { Button } from "@/components/ui/button";
import { draftResult } from "../draftCheck";
import {
  DRAFT_ACTIONS,
  type DraftAction,
  type DraftTaskStep,
  type StepAnswer,
} from "../tourScript";
import TextAnswer from "./TextAnswer";

type Mode = "review" | "edit" | "write";

function Situation({ text }: { text: string }) {
  return (
    <div className="tour-card tour-situation">
      <p className="tour-eyebrow">The situation</p>
      <p>{text}</p>
    </div>
  );
}

function Outcome({ answer }: { answer: StepAnswer }) {
  if (!answer.text)
    return <p className="tour-card tour-outcome">You didn't send the offer.</p>;
  return (
    <div className="tour-card tour-outcome">
      <p className="tour-eyebrow">You sent</p>
      <p className="tour-message">{answer.text}</p>
    </div>
  );
}

/** Task C2: the participant checks Pako's offer draft, which names the wrong day. */
export default function DraftTask({
  step,
  answer,
  onChange,
}: {
  step: DraftTaskStep;
  answer: StepAnswer;
  onChange: (answer: StepAnswer) => void;
}) {
  const [mode, setMode] = useState<Mode>("review");
  const [taps, setTaps] = useState<DraftAction[]>([]);
  const [text, setText] = useState("");

  function open(next: "edit" | "write") {
    setTaps([
      ...taps,
      next === "edit" ? DRAFT_ACTIONS.edit : DRAFT_ACTIONS.writeOwn,
    ]);
    setText(next === "edit" ? step.draft : "");
    setMode(next);
  }

  function finish(action: DraftAction, sent: string | null) {
    onChange({
      chosen: [...taps, action, draftResult(sent)],
      shown: [],
      text: sent ?? "",
    });
  }

  if (answer.chosen.length > 0)
    return (
      <>
        <Situation text={step.situation} />
        <Outcome answer={answer} />
      </>
    );

  const sendLabel = "Send offer";
  const dontSend = (
    <Button
      className="button quiet"
      onClick={() => finish(DRAFT_ACTIONS.dontSend, null)}
    >
      Don't send
    </Button>
  );

  if (mode !== "review")
    return (
      <>
        <Situation text={step.situation} />
        <TextAnswer
          label={
            mode === "edit" ? "Your offer to Mia" : "Your own offer to Mia"
          }
          value={text}
          placeholder={mode === "write" ? "Write your offer" : undefined}
          onChange={setText}
          autoFocus
        />
        <div className="tour-draft-actions">
          <Button
            className="button primary"
            disabled={text.trim() === ""}
            onClick={() => finish(DRAFT_ACTIONS.send, text.trim())}
          >
            {sendLabel}
          </Button>
          {dontSend}
        </div>
      </>
    );

  return (
    <>
      <Situation text={step.situation} />
      <div className="tour-card tour-draft">
        <p className="tour-eyebrow">Pako's draft to Mia</p>
        <p className="tour-message">{step.draft}</p>
      </div>
      <div className="tour-draft-actions">
        <Button
          className="button primary"
          onClick={() => finish(DRAFT_ACTIONS.send, step.draft)}
        >
          {sendLabel}
        </Button>
        <Button className="button secondary" onClick={() => open("edit")}>
          Edit
        </Button>
        <Button className="button secondary" onClick={() => open("write")}>
          Write my own
        </Button>
        {dontSend}
      </div>
    </>
  );
}
