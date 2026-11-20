import { MotionConfig } from "motion/react";
import { Button } from "@/components/ui/button";
import Guide from "@/components/onboarding/Guide";
import type { PakoMood } from "@/components/onboarding/storyTypes";

type NoticeKind = "loading" | "invalid-link" | "unreachable" | "closed";

const NOTICES: Record<
  NoticeKind,
  { title: string; text: string; mood: PakoMood }
> = {
  loading: {
    title: "One moment…",
    text: "I'm getting the study ready.",
    mood: "think",
  },
  "invalid-link": {
    title: "This study link isn't complete.",
    text: "You can still see the tour of takeover.",
    mood: "dizzy",
  },
  unreachable: {
    title: "I can't reach the study right now.",
    text: "Check your connection and try again, or see the tour instead.",
    mood: "sad",
  },
  closed: {
    title: "The study is closed at the moment.",
    text: "Thanks for stopping by. You can still see the tour of takeover.",
    mood: "sleep",
  },
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
  const notice = NOTICES[kind];
  return (
    <MotionConfig reducedMotion="user">
      <main
        className="ob tour-study"
        data-layout="hero"
        aria-labelledby="notice-title"
      >
        <div />
        <div className="ob-body">
          <div className="ob-body-inner">
            <Guide mood={notice.mood} layout="hero" />
            <div
              className="ob-welcome"
              role={kind === "loading" ? "status" : undefined}
            >
              <h1 id="notice-title" className="ob-title">
                {notice.title}
              </h1>
              <p className="ob-lead">{notice.text}</p>
            </div>
          </div>
        </div>
        <footer className="ob-footer">
          {onRetry && (
            <Button className="button primary large" onClick={onRetry}>
              Try again
            </Button>
          )}
          {kind !== "loading" && (
            <Button
              className={`button large ${onRetry ? "quiet" : "primary"}`}
              onClick={onShowPitch}
            >
              Show me the tour
            </Button>
          )}
        </footer>
      </main>
    </MotionConfig>
  );
}
