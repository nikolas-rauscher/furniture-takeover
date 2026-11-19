import { useState, type ReactNode } from "react";
import type { AgentReasoningPart } from "../../shared/runs";
import type { AgentRunStep } from "../hooks/useAgentRun";
import AgentActivity, { StepMark, visibleTaskSteps } from "./AgentActivity";
import AgentReasoning from "./AgentReasoning";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceLine,
  TraceTitle,
} from "./ui/trace";

export default function AgentRunDetails({
  reasoning = [],
  steps = [],
  running,
  heading,
  actions,
  status,
}: {
  reasoning?: readonly AgentReasoningPart[];
  steps?: readonly AgentRunStep[];
  running: boolean;
  heading?: ReactNode;
  actions?: ReactNode;
  status?: string;
}) {
  const [open, setOpen] = useState<boolean>();
  const taskSteps = visibleTaskSteps(steps);
  // While the agent works, one line names the current step and updates in place;
  // an open list would grow step by step and push the results below it around.
  const currentStep = running
    ? ([...taskSteps].reverse().find((step) => step.state === "running") ??
      taskSteps.at(-1))
    : undefined;
  const hasReasoning = reasoning.some(
    (part) => part.text || (running && part.status === "streaming"),
  );
  const hasHeader = Boolean(heading || actions);
  const hasDetails = hasReasoning || steps.length > 0 || running;
  const header = (trigger?: ReactNode) => (
    <div className="agent-run-details-header">
      {heading}
      {trigger}
      {actions}
    </div>
  );
  if (!hasDetails && !hasHeader) return null;
  const failed = steps.some((step) => step.state === "error");
  const unfinished =
    steps.some(
      (step) =>
        step.state === "needs_input" || (!running && step.state === "running"),
    ) ||
    reasoning.some(
      (part) =>
        part.status === "stopped" || (!running && part.status === "streaming"),
    );
  const trigger = (
    <TraceCollapsibleTrigger
      aria-label={
        hasHeader
          ? `Agent activity${steps.length ? `, ${taskSteps.length} ${taskSteps.length === 1 ? "step" : "steps"}` : ""}`
          : undefined
      }
    >
      <TraceLine status={failed ? "error" : undefined}>
        <StepMark
          state={
            running
              ? "running"
              : failed
                ? "failed"
                : unfinished || !hasDetails
                  ? "paused"
                  : "done"
          }
        />
        <TraceTitle>
          {steps.length ? (
            currentStep ? (
              <span key={currentStep.id} className="agent-run-current-step">
                {currentStep.label}
              </span>
            ) : hasHeader ? (
              `${taskSteps.length} ${taskSteps.length === 1 ? "step" : "steps"}`
            ) : (
              "Activity"
            )
          ) : hasReasoning ? (
            "Reasoning"
          ) : running ? (
            "Working…"
          ) : (
            (status ?? "Activity")
          )}
        </TraceTitle>
        {!hasHeader && steps.length > 0 && (
          <TraceDescription>
            {taskSteps.length} {taskSteps.length === 1 ? "step" : "steps"}
          </TraceDescription>
        )}
      </TraceLine>
    </TraceCollapsibleTrigger>
  );
  return (
    <Trace
      className={`agent-run-details${hasHeader ? " has-header" : ""}`}
      aria-label="Agent activity"
      aria-busy={running}
    >
      <TraceCollapsible open={open ?? false} onOpenChange={setOpen}>
        {hasHeader ? header(trigger) : trigger}
        <TraceCollapsibleContent
          keepMounted
          className="agent-run-details-content"
        >
          <AgentActivity steps={steps} running={running} />
          <AgentReasoning parts={reasoning} running={running} />
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
