import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Confetti from "@/components/onboarding/Confetti";
import type { GuideBubble } from "@/components/onboarding/Guide";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import type { StudyPilot } from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import { movesOn } from "../study/arrowMoves";
import { numberPick } from "../study/numberKey";
import { pickOption } from "../study/ChoiceStep";
import StudyShell from "../study/StudyShell";
import type { Recorder } from "../study/useRecorder";
import {
  answerEvent,
  backTarget,
  canGoBack,
  isTourScene,
  nextV3,
  recordV3Answer,
  v3StepById,
  visibleV3Steps,
  withEvent,
  withMoment,
  withoutAnswersOffPath,
  withPriceShown,
  withV3Order,
} from "./v3Flow";
import { PILOT_KEY, v3Job } from "./v3Jobs";
import { ladderOf } from "./packPricing";
import { rememberFinished, type V3Progress } from "./v3Progress";
import {
  PACK_ANSWERS,
  PACK_START_STEP,
  PEEK_STEP,
  packAnswerStep,
  packPriceId,
  type V3ChoiceStep,
  type V3Step,
} from "./v3Script";
import { optionsOf, questionOf } from "./v3Words";
import SectionStrip from "./SectionStrip";
import type { Given, SceneState, StepContext } from "./stepContext";
import V3Footer from "./V3Footer";
import V3StepContent from "./V3StepContent";

/** How long a single tap stays visible before the next step slides in. */
const AUTO_ADVANCE_MS = 300;
/** How long Pako stays happy about an answer before settling again. */
const PICK_MOOD_MS = 1400;

type Transform = (progress: V3Progress) => V3Progress;
type Pending = {
  stepId: string;
  answers: Record<string, Given>;
  /** The arrow keys made the last change, so it is a selection, not yet a pick. */
  moved: boolean;
};

const EMPTY: Given = { chosen: [], text: "" };
const keep: Transform = (progress) => progress;

function moodFor(step: V3Step): PakoMood {
  switch (step.kind) {
    case "about-app":
      return "wave";
    case "story":
      return "listen";
    case "saved":
      return "cheer";
    case "pilot":
      return "wave";
    case "end":
      return "happy";
    default:
      return "idle";
  }
}

/** Pako reacts to answers about the participant, never to answers about the product. */
function reactsToPick(step: V3Step) {
  if (step.kind === "about") return true;
  if (step.kind !== "choice" || step.product) return false;
  return step.section === "you" || step.section === "last-time";
}

/** Pako's title above a question: the part it opens, or the feature it asks about. */
function titleOf(step: V3ChoiceStep, text: TourText) {
  if (step.intro) return text.v3[step.intro];
  return step.feature ? text.scenes[step.feature].title : undefined;
}

function bubbleFor(
  step: V3Step,
  text: TourText,
  progress: V3Progress,
): GuideBubble | undefined {
  const { v3 } = text;
  const { answers } = progress;
  switch (step.kind) {
    case "about-app":
      return { id: step.id, text: v3.whatIs.bubble };
    case "choice":
      return {
        id: step.id,
        title: titleOf(step, text),
        text: questionOf(text, step, answers),
      };
    case "story":
      return { id: step.id, text: v3.lastStory.question };
    case "desk":
      return { id: step.id, text: v3.steps.desk.question };
    case "draft":
      return { id: step.id, text: v3.draft.intro };
    case "ladder": {
      // Pako asks each price in turn; the bubble changes with it, so the new price is read out.
      const { next } = ladderOf(progress);
      const words = v3.packLadder;
      if (next === null) return { id: `${step.id}-done`, text: words.bubble };
      return {
        id: `${step.id}-${next}`,
        title: words.bubble,
        text: words.question(next),
      };
    }
    case "about":
      return { id: step.id, text: v3.about.intro };
    case "scene":
      return {
        id: step.id,
        title: text.scenes[step.scene].title,
        text: text.scenes[step.scene].text,
      };
    case "pilot":
      return { id: step.id, text: v3.pilot.invite };
    case "saved":
    case "end":
      return undefined;
  }
}

function labelFor(
  step: V3Step,
  bubble: GuideBubble | undefined,
  text: TourText,
) {
  if (step.kind === "saved") return text.v3.saved;
  if (step.kind === "end") return text.v3.end.title;
  if (!bubble) throw new Error(`Step ${step.id} has no line from Pako.`);
  return bubble.title ? `${bubble.title} ${bubble.text}` : bubble.text;
}

/** Whether a tap on this step moves on by itself. */
function advancesOnTap(step: V3Step, answer: Given) {
  if (step.kind === "desk") return true;
  if (step.kind !== "choice" || step.disclosure || step.multiple) return false;
  return !step.withText || !answer.chosen.includes(step.withText);
}

/** The ids answered on this screen and what is given for each so far. */
function givenOn(
  step: V3Step,
  pending: Pending | null,
  answers: V3Progress["answers"],
) {
  const ids =
    step.kind === "about" ? step.rows.map((row) => row.id) : [step.id];
  return Object.fromEntries(
    ids.map((id) => [
      id,
      (pending?.stepId === step.id ? pending.answers[id] : undefined) ??
        answers[id] ??
        EMPTY,
    ]),
  );
}

function useTimers() {
  const timers = useRef({ advance: 0, mood: 0 });
  useEffect(() => {
    const current = timers.current;
    return () => {
      window.clearTimeout(current.advance);
      window.clearTimeout(current.mood);
    };
  }, []);
  return timers.current;
}

/** The steps after consent, one at a time, with back, sections and saving. */
export default function V3Steps({
  progress,
  setProgress,
  recorder,
  contact,
  onShowPitch,
}: {
  progress: V3Progress;
  setProgress: (transform: Transform) => void;
  recorder: Recorder;
  contact: string;
  onShowPitch: () => void;
}) {
  const text = useTourText();
  const steps = visibleV3Steps(progress.answers);
  const step = v3StepById(progress.stepId);
  const [pending, setPending] = useState<Pending | null>(null);
  const [mood, setMood] = useState<PakoMood>(moodFor(step));
  const [direction, setDirection] = useState(0);
  const [scenes, setScenes] = useState<Record<string, SceneState>>({});
  const arrivedAt = useRef(performance.now());
  const timers = useTimers();
  const given = givenOn(step, pending, progress.answers);
  const scene = scenes[step.id] ?? { replay: 0, finished: false };

  const log = (kind: Parameters<typeof withEvent>[1], detail?: string) =>
    setProgress((current) => withEvent(current, kind, step.id, detail ?? null));

  function goTo(target: V3Step, travel: 1 | -1, before: Transform = keep) {
    window.clearTimeout(timers.advance);
    window.clearTimeout(timers.mood);
    arrivedAt.current = performance.now();
    setDirection(travel);
    setMood(moodFor(target));
    setPending(null);
    const from = step.id;
    setProgress((current) => {
      // A move ends a skip's jump back; the skip itself records it again.
      const moved = before({ ...current, skippedFrom: null });
      let next = withV3Order({ ...moved, stepId: target.id }, target);
      if (travel === -1) next = withEvent(next, "back", from, target.id);
      next = withEvent(next, "shown", target.id);
      if (target.kind === "ladder") next = withPriceShown(next);
      if (target.kind === "saved") next = withEvent(next, "core-complete");
      if (target.kind === "end") next = withEvent(next, "end");
      return next;
    });
    if (target.kind === "saved") rememberFinished();
  }

  /**
   * The change that stores the given answers and empties those it takes off the path;
   * the saves of every answer it touches are queued at once.
   */
  function storeAnswers(answers: Record<string, Given>): Transform {
    const visitMs = performance.now() - arrivedAt.current;
    arrivedAt.current = performance.now();
    const record: Transform = (current) =>
      Object.entries(answers).reduce((next, [id, answer]) => {
        const earlier = next.answers[id];
        const recorded = recordV3Answer(
          answer,
          next.orders[id] ?? [],
          earlier,
          visitMs,
        );
        return withEvent(
          { ...next, answers: { ...next.answers, [id]: recorded } },
          answerEvent(recorded, earlier),
          id,
        );
      }, current);
    const transform: Transform = (current) =>
      withoutAnswersOffPath(current.answers, record(current));
    const next = transform(progress);
    Object.keys(next.answers)
      .filter((id) => next.answers[id] !== progress.answers[id])
      .forEach((id) => recorder.add(v3Job(next, id)));
    return transform;
  }

  function proceed(answers: Record<string, Given> = given) {
    const transform = storeAnswers(answers);
    goTo(nextV3(transform(progress).answers, step.id), 1, transform);
  }

  const moveOn = () => goTo(nextV3(progress.answers, step.id), 1);

  function reactToPick() {
    window.clearTimeout(timers.mood);
    setMood("happy");
    timers.mood = window.setTimeout(() => setMood(moodFor(step)), PICK_MOOD_MS);
  }

  function answer(id: string, changed: Given, moved = false) {
    const added = changed.chosen.length > (given[id]?.chosen.length ?? 0);
    const confirmsArrowSelection =
      pending?.stepId === step.id && pending.moved && !moved;
    if (added && reactsToPick(step)) reactToPick();
    const answers = { ...given, [id]: changed };
    setPending({ stepId: step.id, answers, moved });
    window.clearTimeout(timers.advance);
    if (
      movesOn({ added, moved, confirmsArrowSelection }) &&
      advancesOnTap(step, changed)
    )
      timers.advance = window.setTimeout(
        () => proceed(answers),
        AUTO_ADVANCE_MS,
      );
  }

  const updateScene = (change: Partial<SceneState>) =>
    setScenes((current) => ({
      ...current,
      [step.id]: { ...scene, ...change },
    }));

  /** Every scene still ahead, the current one included, counts as skipped. */
  function skipTour() {
    const remaining = steps.slice(steps.indexOf(step)).filter(isTourScene);
    const rest = steps[steps.map(isTourScene).lastIndexOf(true) + 1];
    if (!rest) throw new Error("The tour has no step after its scenes.");
    goTo(rest, 1, (current) => ({
      ...remaining.reduce(
        (next, skipped) =>
          skipped.kind === "scene" &&
          !(skipped.id === step.id && scene.finished)
            ? withEvent(next, "scene-skipped", skipped.id, skipped.scene)
            : next,
        current,
      ),
      skippedFrom: step.id,
    }));
  }

  function answerLadder(chosen: string) {
    const ladder = ladderOf(progress);
    // The next price starts without a selection.
    setPending(null);
    if (ladder.next === null) return;
    const answered = storeAnswers({
      ...(ladder.asked.length === 0 && {
        [PACK_START_STEP]: { chosen: [packPriceId(ladder.start)], text: "" },
      }),
      [packAnswerStep(ladder.next)]: { chosen: [chosen], text: "" },
    });
    // The follow-up price, if any, counts as asked from the moment it shows.
    setProgress((current) => withPriceShown(answered(current)));
  }

  function sendPilot(pilot: StudyPilot) {
    const transform: Transform = (current) => ({ ...current, pilot });
    recorder.add(v3Job(transform(progress), PILOT_KEY));
    goTo(nextV3(progress.answers, step.id), 1, transform);
  }

  const context: StepContext = {
    step,
    progress,
    given,
    save: recorder.save,
    contact,
    scene,
    answer,
    proceed,
    moveOn,
    finishAbout: (choice) =>
      proceed({ ...given, [PEEK_STEP]: { chosen: [choice], text: "" } }),
    skipTour,
    replayScene: () => updateScene({ replay: scene.replay + 1 }),
    sceneDone: () => {
      if (scene.finished || step.kind !== "scene") return;
      updateScene({ finished: true });
      log("scene-played", step.scene);
    },
    sceneMoment: (moment, by) =>
      setProgress((current) => withMoment(current, step.id, moment, by)),
    saveNow: (id, given) => setProgress(storeAnswers({ [id]: given })),
    keepUnsentDraft: (unsentDraft) =>
      setProgress((current) => ({ ...current, unsentDraft })),
    answerLadder,
    sendPilot,
    retry: recorder.retry,
    log,
    onMood: setMood,
    onShowPitch,
  };

  // Number keys pick answers and Enter moves on, as long as no control has the key.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (step.kind === "ladder") {
      const pick = numberPick(event, PACK_ANSWERS.length);
      if (pick === null) return;
      event.preventDefault();
      answerLadder(PACK_ANSWERS[pick - 1]);
      return;
    }
    if (
      step.kind !== "choice" ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    const options = optionsOf(text, step, progress);
    const pick = numberPick(event, options.length);
    if (pick !== null) {
      event.preventDefault();
      const picked = pickOption(
        options,
        { ...given[step.id], shown: [] },
        options[pick - 1].id,
        step.multiple ?? false,
      );
      answer(step.id, { chosen: picked.chosen, text: picked.text });
      return;
    }
    const answered = given[step.id].chosen.length > 0;
    if (event.key === "Enter" && answered && !target?.closest("button, a")) {
      event.preventDefault();
      proceed();
    }
  }

  const bubble = bubbleFor(step, text, progress);
  const strip = step.section !== undefined || step.kind === "saved";
  const header =
    step.kind === "end" ? undefined : (
      <>
        <Button
          className="ob-back"
          aria-label={text.common.back}
          disabled={!canGoBack(steps, step)}
          onClick={() => goTo(backTarget(progress), -1)}
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </Button>
        {strip && <SectionStrip step={step} />}
      </>
    );

  return (
    <StudyShell
      stepKey={step.id}
      label={labelFor(step, bubble, text)}
      layout={step.kind === "end" || step.kind === "saved" ? "hero" : "guide"}
      arrangement={step.kind === "scene" ? "beside" : "top"}
      mood={mood}
      bubble={bubble}
      burst={step.kind === "end" ? <Confetti /> : undefined}
      header={header}
      footer={<V3Footer context={context} />}
      direction={direction}
      onKeyDown={handleKeyDown}
      focusFirst
      readOnly={step.kind === "about-app" || step.kind === "draft"}
    >
      <V3StepContent context={context} />
    </StudyShell>
  );
}
