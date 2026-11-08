import type { AgentRunStep } from "../hooks/useAgentRun";
import { Check, LoaderCircle, X } from "./icons";
import {
  Trace,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "./ui/trace";
import "./agent-activity.css";

function ActivityStep({
  step,
  running,
}: {
  step: AgentRunStep;
  running: boolean;
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
      <TraceIcon>
        {active ? (
          <LoaderCircle animate />
        ) : failed ? (
          <X />
        ) : stopped || needsInput ? (
          <span className="agent-trace-dot" />
        ) : (
          <Check />
        )}
      </TraceIcon>
      <TraceTitle>{step.label}</TraceTitle>
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
}: {
  steps: readonly AgentRunStep[];
  running: boolean;
}) {
  const visible = visibleTaskSteps(steps);
  if (!visible.length) return null;
  return (
    <Trace className="agent-activity-list" role="list" aria-label="Agent steps">
      {visible.map((step) => (
        <ActivityStep key={step.id} step={step} running={running} />
      ))}
    </Trace>
  );
}
