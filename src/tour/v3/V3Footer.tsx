import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import type { StepContext } from "./stepContext";
import { ladderOf } from "./packPricing";
import { nextV3 } from "./v3Flow";

/** Whether the screen's main button may be pressed with what is given. */
function isComplete(context: StepContext) {
  const { step, given } = context;
  if (step.kind === "choice" || step.kind === "desk")
    return given[step.id].chosen.length > 0;
  return true;
}

/** The last "About you" screen ends with finishing or watching the tour first. */
function endsAbout(context: StepContext) {
  const { step, progress } = context;
  if (step.kind !== "about") return false;
  return nextV3(progress.answers, step.id).kind !== "about";
}

/** The main buttons of a v3 step. */
export default function V3Footer({ context }: { context: StepContext }) {
  const { common, v3 } = useTourText();
  const { step, given } = context;
  const primary = "button primary large";
  const quiet = "button quiet large";

  switch (step.kind) {
    case "draft":
    case "pilot":
    case "end":
      return null;
    case "ladder": {
      // Continue answers the price the arrow keys selected, or leaves a finished ladder.
      const selected = given[step.id].chosen[0];
      const done = ladderOf(context.progress).next === null;
      return (
        <Button
          className={primary}
          disabled={!done && selected === undefined}
          onClick={() =>
            done ? context.moveOn() : context.answerLadder(selected)
          }
        >
          {common.continue}
        </Button>
      );
    }
    case "about-app":
    case "part":
    case "saved":
      return (
        <Button className={primary} onClick={context.moveOn}>
          {common.continue}
        </Button>
      );
    case "scene": {
      const replay = (
        <Button
          className="button secondary large"
          onClick={context.replayScene}
        >
          {v3.tour.replay}
        </Button>
      );
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
            {v3.tour.next}
          </Button>
          {step.brief ? (
            replay
          ) : (
            <div className="tour-footer-row">
              {replay}
              <Button className={quiet} onClick={context.skipTour}>
                {v3.tour.skipRest}
              </Button>
            </div>
          )}
        </>
      );
    }
    case "about":
      if (endsAbout(context))
        return (
          <div className="tour-footer-row">
            <Button
              className={primary}
              onClick={() => context.finishAbout("finish")}
            >
              {v3.about.finish}
            </Button>
            <Button
              className={primary}
              onClick={() => context.finishAbout("tour")}
            >
              {v3.about.peek}
            </Button>
          </div>
        );
      return (
        <Button className={primary} onClick={() => context.proceed()}>
          {common.continue}
        </Button>
      );
    case "story": {
      const empty = given[step.id].text.trim() === "";
      return (
        <Button className={primary} onClick={() => context.proceed()}>
          {empty ? common.skip : common.continue}
        </Button>
      );
    }
    case "choice":
    case "desk":
      return (
        <Button
          className={primary}
          disabled={!isComplete(context)}
          onClick={() => context.proceed()}
        >
          {common.continue}
        </Button>
      );
  }
}
