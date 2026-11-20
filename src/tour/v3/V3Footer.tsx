import { Button } from "@/components/ui/button";
import { useTourText } from "../i18n/TourLanguage";
import type { StepContext } from "./stepContext";
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
  const { common, v3, notices } = useTourText();
  const { step, given, progress } = context;
  const primary = "button primary large";
  const quiet = "button quiet large";

  switch (step.kind) {
    case "draft":
    case "pilot":
    case "end":
      return null;
    case "reveal":
      if (progress.withdrawn)
        return (
          <Button className={primary} onClick={context.onShowPitch}>
            {notices.showTour}
          </Button>
        );
      return (
        <Button className={primary} onClick={context.moveOn}>
          {common.continue}
        </Button>
      );
    case "saved":
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
            {v3.tour.next}
          </Button>
          <div className="tour-footer-row">
            <Button
              className="button secondary large"
              onClick={context.replayScene}
            >
              {v3.tour.replay}
            </Button>
            <Button className={quiet} onClick={context.skipTour}>
              {v3.tour.skipRest}
            </Button>
          </div>
        </>
      );
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
