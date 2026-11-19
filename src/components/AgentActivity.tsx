import type { AgentRunStep } from "../hooks/useAgentRun";
import { stepWords, type StepVoice } from "../pakoMoods";
import { Check, LoaderCircle, X } from "./icons";
import {
  Trace,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "./ui/trace";
import "./agent-activity.css";

export type StepMarkState = "running" | "done" | "failed" | "paused";

/** The round mark before a step: a spinner while it runs, a check drawn once it is done. */
export function StepMark({ state }: { state: StepMarkState }) {
  return (
    <TraceIcon className="agent-step-mark" data-mark={state}>
      {state === "running" ? (
        <LoaderCircle animate />
      ) : state === "failed" ? (
        <X />
      ) : state === "paused" ? (
        <span className="agent-trace-dot" />
      ) : (
        <Check animate />
      )}
    </TraceIcon>
  );
}

function ActivityStep({
  step,
  running,
  place,
  voice,
}: {
  step: AgentRunStep;
  running: boolean;
  place?: string;
  voice: StepVoice;
}) {
  const active = running && step.state === "running";
  const failed = step.state === "error";
  const stopped = !running && step.state === "running";
  const needsInput = step.state === "needs_input";
  const status = failed
    ? "Failed"
    : stopped
      ? "Stopped"
      : needsInput
        ? "Needs details"
        : active
          ? "In progress"
          : "Done";
  const visibleStatus = failed || stopped || needsInput;
  return (
    <TraceLine
      className="agent-activity-step"
      role="listitem"
      status={failed ? "error" : active ? "running" : undefined}
    >
      <StepMark
        state={
          active
            ? "running"
            : failed
              ? "failed"
              : stopped || needsInput
                ? "paused"
                : "done"
        }
      />
      <TraceTitle>{stepWords(step, place, voice)}</TraceTitle>
      <TraceDescription
        className={visibleStatus ? "agent-step-status" : "sr-only"}
      >
        {status}
        {failed && step.failure ? ` · ${step.failure.message}` : ""}
      </TraceDescription>
    </TraceLine>
  );
}

export function visibleTaskSteps(steps: readonly AgentRunStep[]) {
  const hasWork = steps.some((step) => step.task && step.task !== "request");
  return hasWork
    ? steps.filter((step) => step.task && step.task !== "request")
    : steps;
}

export default function AgentActivity({
  steps,
  running,
  place,
  voice = "search",
}: {
  steps: readonly AgentRunStep[];
  running: boolean;
  /** The search area as Pako names it. */
  place?: string;
  voice?: StepVoice;
}) {
  const visible = visibleTaskSteps(steps);
  if (!visible.length) return null;
  return (
    <Trace className="agent-activity-list" role="list" aria-label="Agent steps">
      {visible.map((step) => (
        <ActivityStep
          key={step.id}
          step={step}
          running={running}
          place={place}
          voice={voice}
        />
      ))}
    </Trace>
  );
}
