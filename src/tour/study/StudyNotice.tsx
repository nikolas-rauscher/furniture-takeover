import { MotionConfig } from "motion/react";
import { Button } from "@/components/ui/button";
import Guide from "@/components/onboarding/Guide";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import LanguageSwitch from "../i18n/LanguageSwitch";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";

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
}: {
  kind: NoticeKind;
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
          </div>
        </div>
        <footer className="ob-footer">
          {onRetry && (
            <Button className="button primary large" onClick={onRetry}>
              {common.tryAgain}
            </Button>
          )}
          {kind !== "loading" && (
            <Button
              className={`button large ${onRetry ? "quiet" : "primary"}`}
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
