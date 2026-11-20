import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";
import Guide, { type GuideBubble } from "@/components/onboarding/Guide";
import { stepFade, stepMotion } from "@/components/onboarding/stepMotion";
import type { PakoMood } from "@/components/onboarding/storyTypes";

export type StudyShellProps = {
  /** Changes with every step, so the step slides in and takes focus. */
  stepKey: string;
  /** The step's accessible name: Pako's line or its heading. */
  label: string;
  layout: "hero" | "guide";
  /** "centred" holds a short step in the middle; "beside" puts Pako next to a phone frame on wide screens. */
  arrangement?: "top" | "centred" | "beside";
  mood: PakoMood;
  bubble?: GuideBubble;
  lines?: GuideBubble[];
  burst?: ReactNode;
  /** Back and progress; the header keeps its space while hidden. */
  header?: ReactNode;
  footer: ReactNode;
  /** 1 forwards, -1 back, 0 for the first step. */
  direction: number;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  /** Also focus the first step, when the shell replaces a screen the participant acted on. */
  focusFirst?: boolean;
  children: ReactNode;
};

/** The intro's sheet as a page: full screen on phones, a centred sheet on larger screens. */
export default function StudyShell({
  stepKey,
  label,
  layout,
  arrangement = "top",
  mood,
  bubble,
  lines,
  burst,
  header,
  footer,
  direction,
  onKeyDown,
  focusFirst = false,
  children,
}: StudyShellProps) {
  const reduced = useReducedMotion() === true;
  const body = useRef<HTMLDivElement>(null);
  const firstStep = useRef(stepKey);

  /** A new step takes focus once it has slid in, so it is announced and Enter works. */
  const arrive = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || (stepKey === firstStep.current && !focusFirst)) return;
      body.current?.scrollTo({ top: 0 });
      element.focus({ preventScroll: true });
    },
    [stepKey, focusFirst],
  );

  return (
    <MotionConfig reducedMotion="user">
      <main
        className="ob tour-study"
        data-layout={layout}
        data-arrangement={arrangement}
        onKeyDown={onKeyDown}
      >
        <h1 className="sr-only">takeover study</h1>
        <header
          className="ob-header"
          data-hidden={header ? undefined : true}
          inert={!header}
        >
          {header}
        </header>
        <div className="ob-body" ref={body}>
          <div className="ob-body-inner">
            <Guide
              mood={mood}
              layout={layout}
              bubble={bubble}
              lines={lines}
              burst={burst}
            />
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={stepKey}
                ref={arrive}
                className="ob-step"
                role="group"
                tabIndex={-1}
                aria-label={label}
                custom={direction}
                variants={reduced ? stepFade : stepMotion}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <footer className="ob-footer">{footer}</footer>
      </main>
    </MotionConfig>
  );
}
