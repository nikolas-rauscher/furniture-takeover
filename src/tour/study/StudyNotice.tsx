import { useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Button } from "@/components/ui/button";
import Guide from "@/components/onboarding/Guide";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import type { StudyPilot } from "../../../shared/study";
import LanguageSwitch from "../i18n/LanguageSwitch";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import { sendPilot } from "../studyApi";
import PilotContact from "../v3/PilotForm";
import { PILOT_KEY } from "../v3/v3Progress";
import { useRecorder } from "./useRecorder";

export function FinishedNotice({
  version,
  onShowPitch,
  onEdit,
}: {
  version: string;
  onShowPitch: () => void;
  onEdit?: () => void;
}) {
  const { v3 } = useTourText();
  const [submitted, setSubmitted] = useState(false);
  const recorder = useRecorder([]);
  function submit(pilot: StudyPilot) {
    recorder.add({ key: PILOT_KEY, send: () => sendPilot(pilot) });
    setSubmitted(true);
  }
  return (
    <StudyNotice
      kind="done-before"
      onShowPitch={onShowPitch}
      action={
        onEdit && (
          <Button className="button primary large" onClick={onEdit}>
            {v3.end.edit}
          </Button>
        )
      }
    >
      <PilotContact
        version={version}
        submitted={submitted}
        save={recorder.save}
        onSend={submit}
        retry={recorder.retry}
      />
    </StudyNotice>
  );
}

type NoticeKind =
  "loading" | "invalid-link" | "unreachable" | "closed" | "done-before";

const NOTICES: Record<
  NoticeKind,
  { words: keyof Omit<TourText["notices"], "showTour">; mood: PakoMood }
> = {
  loading: { words: "loading", mood: "think" },
  "invalid-link": { words: "invalidLink", mood: "dizzy" },
  unreachable: { words: "unreachable", mood: "sad" },
  closed: { words: "closed", mood: "sleep" },
  "done-before": { words: "doneBefore", mood: "happy" },
};

/** Shown instead of the study while it loads, or when it cannot run. */
export default function StudyNotice({
  kind,
  onShowPitch,
  onRetry,
  action,
  children,
}: {
  kind: NoticeKind;
  action?: ReactNode;
  children?: ReactNode;
  onShowPitch: () => void;
  onRetry?: () => void;
}) {
  const { notices, common } = useTourText();
  const notice = NOTICES[kind];
  const words = notices[notice.words];
  return (
    <MotionConfig reducedMotion="user">
      <main
        className="ob tour-study"
        data-layout="hero"
        aria-labelledby="notice-title"
      >
        <header className="ob-header tour-study-header">
          <div className="tour-study-nav" />
          <LanguageSwitch />
        </header>
        <div className="ob-body">
          <div className="ob-body-inner">
            <Guide mood={notice.mood} layout="hero" />
            <div
              className="ob-welcome"
              role={kind === "loading" ? "status" : undefined}
            >
              <h1 id="notice-title" className="ob-title">
                {words.title}
              </h1>
              <p className="ob-lead">{words.text}</p>
            </div>
            {children}
          </div>
        </div>
        <footer className="ob-footer">
          {action}
          {onRetry && (
            <Button className="button primary large" onClick={onRetry}>
              {common.tryAgain}
            </Button>
          )}
          {kind !== "loading" && (
            <Button
              className={`button large ${onRetry || action ? "quiet" : "primary"}`}
              onClick={onShowPitch}
            >
              {notices.showTour}
            </Button>
          )}
        </footer>
      </main>
    </MotionConfig>
  );
}
