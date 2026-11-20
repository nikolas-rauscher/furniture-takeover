import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import type { StepContext } from "./stepContext";
import { WITHDRAW_KEY } from "./v3Jobs";

/** The removal as it goes: on its way, stopped by an error, or done. */
function Removal({ context }: { context: StepContext }) {
  const { v3, common } = useTourText();
  const { reveal } = v3;
  const { save, retry } = context;
  if (!save.unsaved.includes(WITHDRAW_KEY))
    return (
      <div className="ob-welcome tour-end">
        <h2 className="ob-title">{reveal.removedTitle}</h2>
        <p className="ob-lead">{reveal.removedText}</p>
      </div>
    );
  if (save.error && !save.sending)
    return (
      <div className="tour-card tour-save-failed">
        <p>{reveal.removeFailed}</p>
        <Button className="button secondary small" onClick={retry}>
          {common.tryAgain}
        </Button>
      </div>
    );
  return <p className="tour-save">{reveal.removing}</p>;
}

/** After the reveal: a quiet way to take back every answer, with a confirmation first. */
export default function RevealContent({ context }: { context: StepContext }) {
  const { reveal } = useTourText().v3;
  const [confirming, setConfirming] = useState(false);
  const confirm = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (confirming) confirm.current?.focus();
  }, [confirming]);

  if (context.progress.withdrawn)
    return (
      <div role="status">
        <Removal context={context} />
      </div>
    );
  if (!confirming)
    return (
      <button
        type="button"
        className="tour-link tour-link-button"
        onClick={() => setConfirming(true)}
      >
        {reveal.remove}
      </button>
    );
  return (
    <section className="tour-card tour-confirm" aria-labelledby="remove-title">
      <h2
        id="remove-title"
        ref={confirm}
        tabIndex={-1}
        className="tour-card-title"
      >
        {reveal.confirmTitle}
      </h2>
      <p>{reveal.confirmText}</p>
      <div className="tour-draft-actions">
        <Button className="button danger" onClick={context.withdraw}>
          {reveal.remove}
        </Button>
        <Button
          className="button secondary"
          onClick={() => setConfirming(false)}
        >
          {reveal.keep}
        </Button>
      </div>
    </section>
  );
}
