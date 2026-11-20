import { useState } from "react";
import { Button } from "@/components/ui/button";
import { draftResult } from "../draftCheck";
import { useTourText } from "../i18n/TourLanguage";
import {
  DRAFT_ACTIONS,
  type DraftAction,
  type DraftTaskStep,
  type StepAnswer,
} from "../tourScript";
import TextAnswer from "./TextAnswer";

type Mode = "review" | "edit" | "write";

function Situation({ text }: { text: string }) {
  const { v1 } = useTourText();
  return (
    <div className="tour-card tour-situation">
      <p className="tour-eyebrow">{v1.draft.situationTitle}</p>
      <p>{text}</p>
    </div>
  );
}

function Outcome({ answer }: { answer: StepAnswer }) {
  const { v1 } = useTourText();
  if (!answer.text)
    return <p className="tour-card tour-outcome">{v1.draft.notSent}</p>;
  return (
    <div className="tour-card tour-outcome">
      <p className="tour-eyebrow">{v1.draft.sent}</p>
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
  const words = useTourText().v1.draft;
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

  const sendLabel = words.send;
  const dontSend = (
    <Button
      className="button quiet"
      onClick={() => finish(DRAFT_ACTIONS.dontSend, null)}
    >
      {words.dontSend}
    </Button>
  );

  if (mode !== "review")
    return (
      <>
        <Situation text={step.situation} />
        <TextAnswer
          label={mode === "edit" ? words.editLabel : words.ownLabel}
          value={text}
          placeholder={mode === "write" ? words.ownPlaceholder : undefined}
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
        <p className="tour-eyebrow">{words.draftTitle}</p>
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
          {words.edit}
        </Button>
        <Button className="button secondary" onClick={() => open("write")}>
          {words.writeOwn}
        </Button>
        {dontSend}
      </div>
    </>
  );
}
