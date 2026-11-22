import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import { canContinue } from "./v3Flow";
import type { StepContext } from "./stepContext";

/** The main buttons of a step. */
export default function V3Footer({ context }: { context: StepContext }) {
  const { common, v3 } = useTourText();
  const { step, given } = context;
  const primary = "button primary large";

  switch (step.kind) {
    case "draft":
    case "end":
      return null;
    case "part":
      return (
        <Button className={primary} onClick={context.moveOn}>
          {common.continue}
        </Button>
      );
    case "scene":
      return (
        <>
          <Button
            className={primary}
            onClick={() => {
              if (!context.scene.finished)
                context.log("scene-skipped", step.scene);
              context.moveOn();
            }}
          >
            {v3.scene.next}
          </Button>
          <Button
            className="button secondary large"
            onClick={context.replayScene}
          >
            {v3.scene.replay}
          </Button>
        </>
      );
    case "choice":
    case "amount":
      return (
        <Button
          className={primary}
          disabled={!canContinue(step, given[step.id].chosen)}
          onClick={() => context.proceed()}
        >
          {common.continue}
        </Button>
      );
  }
}
