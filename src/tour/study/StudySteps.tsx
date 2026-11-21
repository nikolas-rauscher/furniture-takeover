import { motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Confetti from "@/components/onboarding/Confetti";
import type { GuideBubble } from "@/components/onboarding/Guide";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import { orderOptions } from "../optionOrder";
import { CONTACT_KEY, saveJob } from "../studyJobs";
import {
  answersOffPath,
  EMPTY_ANSWER,
  isAnswered,
  nextStep,
  previousStep,
  recordAnswer,
  withOrder,
} from "../studyFlow";
import type { StudyProgress } from "../studyProgress";
import { useTourLanguage } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import {
  isQuestion,
  STUDY_SCRIPTS,
  stepById,
  visibleSteps,
  type StepAnswer,
  type StudyOption,
  type StudyStep,
} from "../tourScript";
import { pickOption } from "./ChoiceStep";
import { numberPick } from "./numberKey";
import { EMPTY_CONTACT, isValidEmail, type ContactDraft } from "./ContactStep";
import StepContent from "./StepContent";
import { StudyEndContent, useShare } from "./StudyEnd";
import StudyShell from "./StudyShell";
import type { Recorder } from "./useRecorder";
import { useSceneDeadline } from "./useSceneDeadline";

/** How long Pako stays happy about an answer before settling again. */
const PICK_MOOD_MS = 1400;
const END_HEADING = "study-end-title";

function moodFor(step: StudyStep): PakoMood {
  if (step.kind === "end") return "cheer";
  if (step.kind === "line") return "wave";
  if (step.kind === "draft-check" || step.kind === "nearer-or-cheaper")
    return "think";
  return "idle";
}

function bubbleFor(
  step: StudyStep,
  answer: StepAnswer,
  scenes: TourText["scenes"],
): GuideBubble | undefined {
  switch (step.kind) {
    case "single":
    case "multiple":
    case "text":
    case "nearer-or-cheaper":
    case "contact":
      return { id: step.id, text: step.question };
    case "line":
      return { id: step.id, text: step.text };
    case "draft-check":
      return answer.chosen.length > 0
        ? { id: `${step.id}-explained`, text: step.explanation }
        : { id: step.id, text: step.prompt };
    case "scene": {
      const { title, text } = scenes[step.scene];
      return { id: step.id, title, text };
    }
    case "end":
      return undefined;
  }
}

/** The draft task keeps one bubble for the prompt and the explanation that replaces it. */
function linesFor(step: StudyStep): GuideBubble[] | undefined {
  if (step.kind !== "draft-check") return undefined;
  return [
    { id: step.id, text: step.prompt },
    { id: `${step.id}-explained`, text: step.explanation },
  ];
}

function optionsFor(step: StudyStep, progress: StudyProgress): StudyOption[] {
  if (!("options" in step)) return [];
  const order = progress.orders[step.id];
  return order ? orderOptions(step.options, order) : step.options;
}

function stepLabel(step: StudyStep, bubble: GuideBubble | undefined) {
  if (step.kind === "end") return step.text;
  if (!bubble) throw new Error(`Step ${step.id} has no line from Pako.`);
  return bubble.title ?? bubble.text;
}

function arrangementFor(step: StudyStep) {
  if (step.kind === "scene") return "beside";
  return step.kind === "line" ? "centred" : "top";
}

function isSkippable(step: StudyStep) {
  return (step.kind === "single" || step.kind === "multiple") && step.skippable;
}

type DraftAnswer = { stepId: string; answer: StepAnswer };

/** The steps after consent, one at a time, with back, progress and saving. */
export default function StudySteps({
  progress,
  onProgress,
  recorder,
}: {
  progress: StudyProgress;
  onProgress: (progress: StudyProgress) => void;
  recorder: Recorder;
}) {
  const { language, text } = useTourLanguage();
  const script = STUDY_SCRIPTS[language];
  const step = stepById(script, progress.stepId);
  const steps = visibleSteps(script, progress.answers);
  const index = steps.findIndex((candidate) => candidate.id === step.id);
  const options = optionsFor(step, progress);
  const [draft, setDraft] = useState<DraftAnswer | null>(null);
  const [contact, setContact] = useState<ContactDraft>(EMPTY_CONTACT);
  const [finishedScenes, setFinishedScenes] = useState<string[]>([]);
  const [mood, setMood] = useState<PakoMood>(moodFor(step));
  const [direction, setDirection] = useState(0);
  const arrivedAt = useRef(performance.now());
  const moodTimer = useRef(0);
  const { share, copy } = useShare();
  const answer =
    draft?.stepId === step.id
      ? draft.answer
      : (progress.answers[step.id] ?? EMPTY_ANSWER);

  useEffect(() => () => window.clearTimeout(moodTimer.current), []);

  function goTo(target: StudyStep, travel: 1 | -1, next: StudyProgress) {
    window.clearTimeout(moodTimer.current);
    arrivedAt.current = performance.now();
    setDirection(travel);
    setMood(moodFor(target));
    onProgress(withOrder({ ...next, stepId: target.id }, target));
  }

  function proceed(given: StepAnswer = answer) {
    if (!isQuestion(step)) {
      goTo(nextStep(script, progress.answers, step.id), 1, progress);
      return;
    }
    const recorded = recordAnswer(
      { ...given, shown: progress.orders[step.id] ?? [] },
      progress.answers[step.id],
      performance.now() - arrivedAt.current,
    );
    const answered = { ...progress.answers, [step.id]: recorded };
    const emptied = answersOffPath(script, progress.answers, answered);
    const next = { ...progress, answers: { ...answered, ...emptied } };
    // The emptied answers are saved first, so the changed step stays the latest save.
    [...Object.keys(emptied), step.id].forEach((id) =>
      recorder.add(saveJob(next, id)),
    );
    goTo(nextStep(script, next.answers, step.id), 1, next);
  }

  function sendContact() {
    const next = {
      ...progress,
      contact: {
        email: contact.email.trim(),
        pilot: contact.pilot,
        session: contact.link ? progress.session : null,
      },
    };
    recorder.add(saveJob(next, CONTACT_KEY));
    goTo(nextStep(script, next.answers, step.id), 1, next);
  }

  function changeAnswer(changed: StepAnswer) {
    if (changed.chosen.length > answer.chosen.length) reactToPick();
    setDraft({ stepId: step.id, answer: changed });
  }

  function reactToPick() {
    window.clearTimeout(moodTimer.current);
    setMood("happy");
    moodTimer.current = window.setTimeout(
      () => setMood(moodFor(step)),
      PICK_MOOD_MS,
    );
  }

  const finishScene = () =>
    setFinishedScenes((done) =>
      done.includes(step.id) ? done : [...done, step.id],
    );
  const sceneFinished = finishedScenes.includes(step.id);
  useSceneDeadline(step, sceneFinished, finishScene);
  const canContinue =
    step.kind === "scene" ? sceneFinished : isAnswered(step, answer);

  // Number keys pick answers and Enter moves on, as long as no control has the key.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    const pick = numberPick(event, options.length);
    if (pick !== null) {
      event.preventDefault();
      changeAnswer(
        pickOption(
          options,
          answer,
          options[pick - 1].id,
          step.kind === "multiple",
        ),
      );
      return;
    }
    const movesOn = step.kind !== "end" && step.kind !== "contact";
    if (
      event.key === "Enter" &&
      canContinue &&
      movesOn &&
      !target?.closest("button, a")
    ) {
      event.preventDefault();
      proceed();
    }
  }

  const bubble = bubbleFor(step, answer, text.scenes);
  const header =
    step.kind === "end" ? undefined : (
      <>
        <Button
          className="ob-back"
          aria-label={text.common.back}
          disabled={index === 0}
          onClick={() =>
            goTo(previousStep(script, progress.answers, step.id), -1, progress)
          }
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </Button>
        <div
          className="ob-progress"
          role="progressbar"
          aria-label={text.v1.progress}
          aria-valuemin={0}
          aria-valuemax={steps.length - 1}
          aria-valuenow={index}
          aria-valuetext={text.v1.stepOf(index + 1, steps.length)}
        >
          <motion.span
            className="ob-progress-fill"
            initial={false}
            animate={{ width: `${(index / (steps.length - 1)) * 100}%` }}
            transition={{ type: "spring", stiffness: 170, damping: 24 }}
          />
        </div>
      </>
    );

  function footer() {
    if (step.kind === "end")
      return (
        <>
          <a className="button primary large" href="/">
            {text.common.openApp}
          </a>
          <Button className="button quiet large" onClick={copy}>
            {text.v1.end.share}
          </Button>
        </>
      );
    if (step.kind === "contact")
      return (
        <>
          <Button
            className="button primary large"
            disabled={!isValidEmail(contact.email)}
            onClick={sendContact}
          >
            {text.common.send}
          </Button>
          <Button
            className="button quiet large"
            onClick={() =>
              goTo(nextStep(script, progress.answers, step.id), 1, progress)
            }
          >
            {text.common.skip}
          </Button>
        </>
      );
    const textOnly = step.kind === "text";
    return (
      <>
        <Button
          className="button primary large"
          disabled={!canContinue}
          onClick={() => proceed()}
        >
          {textOnly && answer.text.trim() === ""
            ? text.common.skip
            : text.common.continue}
        </Button>
        {isSkippable(step) && (
          <Button
            className="button quiet large"
            onClick={() => proceed(EMPTY_ANSWER)}
          >
            {text.common.skip}
          </Button>
        )}
      </>
    );
  }

  return (
    <StudyShell
      stepKey={step.id}
      label={stepLabel(step, bubble)}
      layout={step.kind === "end" ? "hero" : "guide"}
      arrangement={arrangementFor(step)}
      mood={mood}
      bubble={bubble}
      lines={linesFor(step)}
      burst={step.kind === "end" ? <Confetti /> : undefined}
      header={header}
      footer={footer()}
      direction={direction}
      onKeyDown={handleKeyDown}
      focusFirst
    >
      {step.kind === "end" ? (
        <StudyEndContent
          headingId={END_HEADING}
          text={step.text}
          save={recorder.save}
          onRetry={recorder.retry}
          share={share}
        />
      ) : (
        <StepContent
          step={step}
          options={options}
          answer={answer}
          onAnswer={changeAnswer}
          contact={contact}
          onContact={setContact}
          onMood={setMood}
          onSceneDone={finishScene}
        />
      )}
    </StudyShell>
  );
}
